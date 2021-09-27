---
layout: post
title: Building Bots with Bots
updated: 2021-09-27 18:12
comments: true
publised: false
---

In a [recent study](https://www.gartner.com/smarterwithgartner/chatbots-will-appeal-to-modern-workers) by Gartner, they estimated that as many as 70% of white collar workers will interact with chat bots on a daily basis by 2022. Just this year in South Africa, we have seen a number of multinationals launch their chat bot technology alongside other market leaders.

* [Multichoice](https://www.iol.co.za/technology/multichoice-launches-chatbot-to-boost-its-service-67353507-b96f-4d6a-92b9-257d7988635d)
* [Nedbank](https://www.itnewsafrica.com/2021/09/nedbank-launches-enbi-a-new-intelligent-chatbot-assistant/)
* [Eskom](https://www.iol.co.za/business-report/companies/eskom-enhances-its-digital-platforms-by-launching-a-chatbot-alfred-and-enhancing-its-app-c9e50f68-fad7-40a1-a133-c7b3090fdafd)
* [Deparment of Health](https://www.sanews.gov.za/south-africa/access-all-covid-19-facts-whatsapp)
* [Carling Black Label](https://ewn.co.za/2020/05/02/carling-black-label-launches-whatsapp-line-to-help-gbv-victims)
* [Western Cape Government](https://www.westerncape.gov.za/news/new-healthbot-launched-high-risk-patients-during-covid-19)

We have also seen bots find homes inside large organizations, embedded into applications like Slack, Discord and Microsoft Teams. Usually these bots offer question and answer services and are quickly replacing the intranet FAQ websites we have come to know and love. Microsoft released the Bot Framework in 2016 and after taking it for a spin, i found an [issue](https://github.com/microsoft/botframework-sdk/issues/94) that prevented me using it in a real world application. 

More recently i was asked to help a team responsible for managing the Bot Framework inside a large organization design a solution for the management of knowledge base content. Specifically, the Bot Framework had been integrated with the Microsoft QnA Maker service and the team had been managing the question and answer pairs manually. The process to get questions added to the company knowledge base consisted of sending one of the team members a Microsoft Teams message with your question and answer content, which they would then add via the QnA Maker web interface. With the bot catching on and over 60 teams submitting question and answer content, the process was not scaling and all development time was now spent managing content. 

After chatting with a few friends, it was clear that we needed to replace the developers with a bot that could allow users to add their own content.

### Prerequisites

* Install [Visual Studio](https://visualstudio.microsoft.com/)
* Install [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator/releases)
* Install [Bot Framework SDK Templates](https://marketplace.visualstudio.com/items?itemName=BotBuilder.botbuilderv4)
* [Create a knowledge base](https://docs.microsoft.com/en-us/azure/cognitive-services/qnamaker/quickstarts/create-publish-knowledge-base?tabs=v1) on QnA Maker
* The namespace used in this blog post is CoreBotAzureBootcampDemo.


### Plumbing

First up, we need to open Visual Studio and create a new project based on the newly installed `Core Bot` template. The template comes with a whole bunch of example files and directories that we don't need, so lets start by deleting the following:

* `BookingDetails.cs`
* `FlightBookingRecognizer.cs`
* `BookingDialog.cs`
* `CancelAndHelpDialog.cs`
* `DateResolverDialog.cs`
* `CognitiveModels`

We then need to add a few Nuget packages to our project.

```bash
dotnet add package AdaptiveCards
dotnet add package Microsoft.Azure.CognitiveServices.Knowledge.QnAMaker
dotnet add package Microsoft.Bot.Builder.AI.QnA 
```

We also need to add our QnA Maker configuration to our `appsettings.json` file. 

* `KnowledgebaseId` - this can be found in the QnA maker  under settings.
* `QnAEndpointKey` - this can be found in the QnA maker  under settings
* `ResourceName` - this is the name of the QnA Maker resource in Azure
*  `SubscriptionKey` -  this can be found in the Azure portal under `Keys and Endpoint` on the QnA Maker resource

Your `appsettings.json` should look something like this once you are done.

```javascript
{
  "MicrosoftAppId": "",
  "MicrosoftAppPassword": "",
  "QnAEndpointKey": "df9e32de-d666-4dcb-f7g5-1275ddh4ksnf",
  "KnowledgebaseId": "3f113c38-dcc8-4bf7-6723-6a6c946fe433",
  "ResourceName": "dh-demo-qna",
  "SubscriptionKey": "d91cgf927410ff47b738bdbf64a91020"
}
```

Lastly, we need to remove some dependencies that were wired up in the `Startup.cs` file. In particular, we can remove these lines.


```csharp
// Register LUIS recognizer
services.AddSingleton<FlightBookingRecognizer>();
 
// Register the BookingDialog.
services.AddSingleton<BookingDialog>();
```

### QNAMakerService

Integrating with the QnA Maker API is fairly easy using the Nuget packages we installed earlier. Our bot will need to do two things.

* Get an answer to a question
* Add additional questions to the knowledge base

So go ahead and create a new `Services` directory in the root of your project, and then add a new class called `QNAMakerService.cs` with the following content.

```csharp
using Microsoft.Azure.CognitiveServices.Knowledge.QnAMaker;
using Microsoft.Azure.CognitiveServices.Knowledge.QnAMaker.Models;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.AI.QnA;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CoreBotAzureBootcampDemo.Services
{
    public interface IQNAMakerService
    {
        Task<QueryResult[]> GetQuestionResults(HttpClient httpClient, ITurnContext turnContext);
        Task CreateQuestion(string question, string answer);
    }

    public class QNAMakerService : IQNAMakerService
    {
        public readonly IConfiguration _configuration;

        public QNAMakerService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<QueryResult[]> GetQuestionResults(HttpClient httpClient, ITurnContext turnContext)
        {
            var qnaMaker = new QnAMaker(new QnAMakerEndpoint
            {
                KnowledgeBaseId = _configuration["KnowledgebaseId"],
                EndpointKey = _configuration["QnAEndpointKey"],
                Host = $"https://{_configuration["ResourceName"]}.azurewebsites.net/qnamaker"
        }, null, httpClient);

            var options = new QnAMakerOptions { Top = 1 };
            return await qnaMaker.GetAnswersAsync(turnContext, options);
        }

        public async Task CreateQuestion(string question, string answer)
        {
            var endpoint = $"https://{_configuration["ResourceName"]}.cognitiveservices.azure.com";
            var client = new QnAMakerClient(new ApiKeyServiceClientCredentials(_configuration["SubscriptionKey"])) { Endpoint = endpoint };
            var update = await client.Knowledgebase.UpdateAsync(_configuration["KnowledgebaseId"], new UpdateKbOperationDTO
            {
                Add = new UpdateKbOperationDTOAdd
                {
                    QnaList = new List<QnADTO> {
                        new QnADTO {
                            Questions = new List<string> { question },
                            Answer = answer,
                        }
                    },
                },
                Update = null,
                Delete = null
            }); ;

            await MonitorOperation(client, update);
            await client.Knowledgebase.PublishAsync(_configuration["KnowledgebaseId"]);
        }

        private static async Task<Operation> MonitorOperation(QnAMakerClient client, Operation operation)
        {
            for (int i = 0; i < 20 && (operation.OperationState == OperationStateType.NotStarted || operation.OperationState == OperationStateType.Running); i++)
            {
                Console.WriteLine("Waiting for operation: {0} to complete.", operation.OperationId);
                await Task.Delay(5000);
                operation = await client.Operations.GetDetailsAsync(operation.OperationId);
            }

            if (operation.OperationState != OperationStateType.Succeeded)
            {
                throw new Exception($"Operation {operation.OperationId} failed to completed.");
            }
            return operation;
        }
    }
}
```

Our `QNAMakerService` makes use of the configuration that we added further up along with the QnA Maker SDK to provide methods that allow us to easily create questions, as well as search for answers in our knowledge base. For this to be useful via a chat bot, we need to call this service from a dialog that guides the user through a conversation in order to gather all the required inputs to carry out the operation. 

### Dialogs

The Bot Framework has a built in type called `WaterfallDialog` which provides us with functionality to guide users through a series of steps to gather information. We will need 3 waterfall dialogs.

* `MainDialog.cs` - this is the main entry point. You can think of the `MainDialog` as a router, routing the user to either `AddQuestionDialog` or `AskQuestionDialog` depending on what they want to do.
* `AddQuestionDialog.cs` - this dialog asks the user for the question and answer they want to add to the knowledge base. 
* `AskQuestionDialog.cs` - this dialog simply queries the knowledge base for your question and send you the answer.

Lets start by creating a new class in the `Dialogs` directory called `AskQuestionDialog`, giving it the following content.

```csharp
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Azure.CognitiveServices.Knowledge;
using Microsoft.Bot.Builder.AI.QnA;
using System.Net.Http;
using CoreBotAzureBootcampDemo.Services;

namespace CoreBotAzureBootcampDemo.Dialogs
{
    public class AskQuestionDialog : ComponentDialog
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IQNAMakerService _qnaMakerService;
        
        public AskQuestionDialog(IConfiguration configuration, 
            IHttpClientFactory httpClientFactory,
            IQNAMakerService qnaMakerService) : base(nameof(AskQuestionDialog))
        {
            _qnaMakerService = qnaMakerService;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;

            var steps = new WaterfallStep[]
            {
                QuestionStepAsync,
                AnswerStepAsync,
            };

            AddDialog(new WaterfallDialog(nameof(WaterfallDialog), steps));
            AddDialog(new TextPrompt(nameof(TextPrompt)));

            InitialDialogId = nameof(WaterfallDialog);
        }

        private async Task<DialogTurnResult> QuestionStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            return await stepContext.PromptAsync(nameof(TextPrompt), new PromptOptions
            {
                Prompt = MessageFactory.Text("How can i help you today?")

            }, cancellationToken);
        }

        private async Task<DialogTurnResult> AnswerStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var response = await _qnaMakerService.GetQuestionResults(_httpClientFactory.CreateClient(), stepContext.Context);
            if (response != null && response.Length > 0)
            {
                await stepContext.Context.SendActivityAsync(MessageFactory.Text(response[0].Answer), cancellationToken);
            }
            else
            {
                await stepContext.Context.SendActivityAsync(MessageFactory.Text("No answers were found for that question."), cancellationToken);
            }

            return await stepContext.EndDialogAsync(cancellationToken: cancellationToken);
        }
    }
}
```

The dialog itself is pretty simple, asking the user `"How can i help you today?"` before searching our knowledge base for any answers. You will notice the use of our `QNAMakerService` which we authored further up. In the event that no answers can be found, our dialog will return a response of `"No answers were found for that question."` before ending the conversation.

Next we need a way to let our users contribute their own questions and answers. To do this, lets create another class in the `Dialogs` directory, this time calling it `AddQuestionDialog` and giving it the following content.

```csharp
using CoreBotAzureBootcampDemo.Services;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CoreBotAzureBootcampDemo.Dialogs
{
    public class AddQuestionDialog : ComponentDialog
    {
        private readonly IConfiguration _configuration;
        private readonly IQNAMakerService _qnaMakerService;

        public AddQuestionDialog(IConfiguration configuration, IQNAMakerService qnaMakerService) : base(nameof(AddQuestionDialog))
        {
            _qnaMakerService = qnaMakerService;
            _configuration = configuration;

            var steps = new WaterfallStep[]
            {
                QuestionStepAsync,
                AnswerStepAsync,
                ConfirmStepAsync,
                SummaryStepAsync
            };
            AddDialog(new ConfirmPrompt(nameof(ConfirmPrompt)));
            AddDialog(new WaterfallDialog(nameof(WaterfallDialog), steps));
            AddDialog(new TextPrompt(nameof(TextPrompt)));

            InitialDialogId = nameof(WaterfallDialog);
        }

        private async Task<DialogTurnResult> QuestionStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            return await stepContext.PromptAsync(nameof(TextPrompt), new PromptOptions
            {
                Prompt = MessageFactory.Text("Please enter the question.")
            }, cancellationToken);
        }
        private async Task<DialogTurnResult> AnswerStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            stepContext.Values["Question"] = (string)stepContext.Result;

            return await stepContext.PromptAsync(nameof(TextPrompt), new PromptOptions
            {
                Prompt = MessageFactory.Text("Please enter the answer.")
            }, cancellationToken);
        }

        private async Task<DialogTurnResult> ConfirmStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            stepContext.Values["Answer"] = (string)stepContext.Result;

            await stepContext.Context.SendActivityAsync(MessageFactory.Text($"The following data will be added to your knowledge base. \n\n" +
                $"**Question**:  {stepContext.Values["Question"]} \n\n" +
                $"**Answer**: {stepContext.Values["Answer"]}"), cancellationToken);

            return await stepContext.PromptAsync(nameof(ConfirmPrompt), new PromptOptions
            {
                Prompt = MessageFactory.Text("Is everything correct?")
            }, cancellationToken);
        }

        private async Task<DialogTurnResult> SummaryStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            if ((bool)stepContext.Result)
            {
                await _qnaMakerService.CreateQuestion(stepContext.Values["Question"].ToString(), stepContext.Values["Answer"].ToString());

                await stepContext.Context.SendActivityAsync(MessageFactory.Text($"The following data has been added to your knowledge base. \n\n" +
                    $"**Question**:  {stepContext.Values["Question"]} \n\n" +
                    $"**Answer**: {stepContext.Values["Answer"]}"), cancellationToken);

                return await stepContext.EndDialogAsync(null, cancellationToken);
            }
            else
            {
                return await stepContext.EndDialogAsync(cancellationToken: cancellationToken);
            }
        }
    }
}
```
In this dialog we ask the user to provide us with a question and an answer. The user is then asked to confirm the data before the bot uploads it to the QnAMaker service in the `SummaryStepAsync` step. 

Now that we have a dialog to both ask a question, as well as contribute a question, we need to setup our `MainDialog` to route the user appropriately. Since we only have two actions, lets crack open `MainDialog.cs` and use a card to ask the user which action they would like to perform.

```csharp
using AdaptiveCards;
using CoreBotAzureBootcampDemo.Services;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Builder.Dialogs.Choices;
using Microsoft.Bot.Schema;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace CoreBotAzureBootcampDemo.Dialogs
{
    public class MainDialog : ComponentDialog
    {
        private readonly ILogger _logger;
        private readonly IConfiguration _configuration;
        public MainDialog(ILogger<MainDialog> logger, 
                          IQNAMakerService qnaMakerService,
                          IHttpClientFactory httpClientFactory,
                          IConfiguration configuration) : base(nameof(MainDialog))
        {
            _configuration = configuration;
            _logger = logger;

            AddDialog(new AskQuestionDialog(_configuration, httpClientFactory, qnaMakerService));
            AddDialog(new AddQuestionDialog(_configuration, qnaMakerService));

            AddDialog(new ChoicePrompt(nameof(ChoicePrompt)));
            AddDialog(new TextPrompt(nameof(TextPrompt)));

            AddDialog(new WaterfallDialog(nameof(WaterfallDialog), new WaterfallStep[]
            {
                IntroStepAsync,
                ActStepAsync,
                FinalStepAsync,
            }));

            InitialDialogId = nameof(WaterfallDialog);
        }

        private async Task<DialogTurnResult> IntroStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var options = stepContext?.Options;
            if (options == null) {
                await stepContext.Context.SendActivityAsync(MessageFactory.Text("What would you like to do today?"), cancellationToken);
            }

            var operationList = new List<string> { "Ask a question", "Contribute a question" };
           
            var card = new AdaptiveCard(new AdaptiveSchemaVersion(1, 0))
            {
                Actions = operationList.Select(choice => new AdaptiveSubmitAction
                {
                    Title = choice,
                    Data = choice,  
                }).ToList<AdaptiveAction>(),
            };

            return await stepContext.PromptAsync(nameof(ChoicePrompt), new PromptOptions
            {
                Prompt = (Activity)MessageFactory.Attachment(new Attachment
                {
                    ContentType = AdaptiveCard.ContentType,
                    Content = JObject.FromObject(card),
                }),
                Choices = ChoiceFactory.ToChoices(operationList),
                Style = ListStyle.None,
            }, cancellationToken);
        }

        private async Task<DialogTurnResult> ActStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            stepContext.Values["Operation"] = ((FoundChoice)stepContext.Result).Value;
            string operation = (string)stepContext.Values["Operation"];

            if (operation.Equals("Ask a question"))
            {
                return await stepContext.BeginDialogAsync(nameof(AskQuestionDialog), null, cancellationToken);
            }
            else if (operation.Equals("Contribute a question"))
            {
                return await stepContext.BeginDialogAsync(nameof(AddQuestionDialog), null, cancellationToken);
            }

            return await stepContext.NextAsync(null, cancellationToken);
        }

        private async Task<DialogTurnResult> FinalStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
        {
            var text = "Is there anything else we can do for you?";
            await stepContext.Context.SendActivityAsync(MessageFactory.Text(text), cancellationToken);

            return await stepContext.ReplaceDialogAsync(nameof(MainDialog), new { }, cancellationToken);
        }
    }

}
```
We pretty much have everything we need at this point. One thing to note is that when a user connects to the conversation the `DialogAndWelcomeBot` class loads a greeting from `Cards\welcomCard.json` which defaults to a generic Bot Framework message with links to their documentation. We can go ahead and change this, i updated mine for this post.

```javascript
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.0",
  "body": [
    {
      "type": "Image",
      "url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtB3AwMUeNoq4gUBGe6Ocj8kyh3bXa9ZbV7u1fVKQoyKFHdkqU",
      "size": "stretch"
    },
    {
      "type": "TextBlock",
      "spacing": "medium",
      "size": "default",
      "weight": "bolder",
      "text": "Welcome to Azure Bootcamp 2021!",
      "wrap": true,
      "maxLines": 0
    },
    {
      "type": "TextBlock",
      "size": "default",
      "isSubtle": true,
      "text": "In this session we will look at what it takes to update our knowledge bases using this bot. The session is accompanied by a blog post, which you can find below.",
      "wrap": true,
      "maxLines": 0
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Visit Blog",
      "url": "https://www.taylorgibb.com/building-bots-with-bots"
    }
  ]
}
```

### Wiring It Up

Lastly we need to add `IHttpClientFactory` and `IQNAMakerService` to our dependency injection container. To do that, we can open our `Startup.cs` file and add the following lines to the `ConfigureServices` method.

```csharp
services.AddHttpClient();
services.AddSingleton<IQNAMakerService, QNAMakerService>();
```

Thats pretty much all there is too it, lets see how it looks in action using the Bot Framework Emulator.

<div style="width:100%;height:0;padding-bottom:61%;position:relative;"><iframe src="https://giphy.com/embed/My2ogUmJvsvXJObEt5" width="100%" height="100%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div>

