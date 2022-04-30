---
layout: post
title: Generating Large JSON Files
updated: 2022-04-30 20:01
comments: true
---

I recently had a customer with a requirement to expose an API that was capable of handling millions of JSON objects at a time. When the system was designed their inbound API only supported CSV. This design decision was made due to the large data involved. With CSV files, you include a header row which means the column names are not duplicated for each row, unlike JSON where each object would have a property name and its corresponding value. They gave me a small CSV file which contained a header row and an additional 145 objects. The file weighed in at just over 17KB. Converting that to JSON gave me 6527 lines of JSON (a 4400 percent increase in lines), weighing in at just over 205KB (a 1200 percent increase in file size). Even on small scale, the difference is noticeable. This data needed to be read and put into a database which is the subject of my next blog post, so stay tuned.

While i was testing a few solutions it became clear that i needed a way to test with large JSON datasets but the biggest ones i could find online ranged from 25MB to 100MB and i wanted at least a few gigabytes of data. With large data, you quickly run into problems, in C# for example the maximum size of a CLR object is 2GB including on a 64-bit systems and even then, fragmentation of the large object heap can cause objects that are less than 2GB to cause an Out Of Memory Exception. In short, this means that you cant just make a list, add objects to it and then serialize it to disk. Instead, you need you stream the data one object at a time. The object i envisioned was the following:

```json
{
  "FirstName": "Taylor",
  "LastName": "Gibb",
  "City": "Durban",
  "Company": "Developer Hut",
  "DateOfBirth": "22/06/1993"
}
```

The logic i had in my head was:

- Write StartArray token
- While file size is less than a gigabyte, write object
- Write EndArray token
- Log object count and time elapsed

If we use static data, this can be expressed in C# as:

```csharp
var file = @"C:\Users\taylo\Desktop\developer-hut\large-static.json";

using (var writer = new StreamWriter(file))
{
    var count = 0;
    var watch = new Stopwatch();
    var sb = new StringBuilder();
    var sw = new StringWriter(sb);
    var jtw = new JsonTextWriter(sw);

    watch.Start();
    jtw.WriteStartArray();
    writer.Write(sb.ToString());
    sb.Clear();

    while (true)
    {
        var kb = new FileInfo(file).Length / 1024;
        var mb = kb / 1024;
        if (mb >= 1024)
        {
            break;
        }

        jtw.WriteStartObject();
        jtw.WritePropertyName("FirstName");
        jtw.WriteValue("Taylor");
        jtw.WritePropertyName("LastName");
        jtw.WriteValue("Gibb");
        jtw.WritePropertyName("City");
        jtw.WriteValue("Durban");
        jtw.WritePropertyName("Company");
        jtw.WriteValue("Developer Hut");
        jtw.WritePropertyName("DateOfBirth");
        jtw.WriteValue("22/06/1993");
        jtw.WriteEndObject();

        writer.Write(sb.ToString());
        sb.Clear();
        count++;

    }

    jtw.WriteEndArray();
    writer.Write(sb.ToString());
    jtw.Close();
    sw.Close();
    watch.Stop();

    Console.WriteLine($"Written {count} Records In {watch.Elapsed} ");
}
```

The above resulted in exactly a gigabyte of data with `9 761 299` objects written to the JSON file in `2 minutes and 29 seconds` on my laptop which is an 11th Gen i7-11800H running at 2.30GHz, my laptop has 32GB of ram but the app only consumed around 18MB at any given moment. Not bad, but what if i want to mix things up a bit and generate some random data ? I did a quick Google and found [Bogus](https://github.com/bchavez/Bogus) which is a C# port of [faker.js](https://github.com/faker-js/faker) and made the following updates to the JSON object.

```csharp
var faker = new Faker("en");
jtw.WriteStartObject();
jtw.WritePropertyName("FirstName");
jtw.WriteValue(faker.Person.FirstName);
jtw.WritePropertyName("LastName");
jtw.WriteValue(faker.Person.LastName);
jtw.WritePropertyName("City");
jtw.WriteValue(faker.Person.Address.City);
jtw.WritePropertyName("Company");
jtw.WriteValue(faker.Person.Company.Name);
jtw.WritePropertyName("DateOfBirth");
jtw.WriteValue(faker.Person.DateOfBirth.ToShortDateString());
jtw.WriteEndObject();
```

The performance was not great, it wrote `X` objects but took a massive `2 hours 37 minutes` to run. It turns out Bogus takes around 13 minutes to generate a million fakes, and i need closer to 10 million. Since this is just test data, i toyed around with the idea of just using random 5 character strings and came up with the following to test my logic on a million iterations. 

```csharp
var random = new Random();
var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
for (int i = 0; i < 1000000; i++)
{
    var str = new string(chars.Select(c => chars[random.Next(chars.Length)]).Take(8).ToArray());
    Console.WriteLine(str);
}
```

This looks much better, it takes 6 seconds to generate a hundred thousand strings and just under a minute to generate a million of them. This will do for testing and save hours generating data, so i updated the app as follows.

```csharp
class Program
{
    private static Random _random = new Random();

    static void Main(string[] args)
    {
        var file = @"C:\Users\taylo\Desktop\developer-hut\large-random-net.json";

        using (var writer = new StreamWriter(file))
        {
            var count = 0;
            var watch = new Stopwatch();
            var sb = new StringBuilder();
            var sw = new StringWriter(sb);
            var jtw = new JsonTextWriter(sw);

            watch.Start();
            jtw.WriteStartArray();
            writer.Write(sb.ToString());
            sb.Clear();

            while (true)
            {
                var kb = new FileInfo(file).Length / 1024;
                var mb = kb / 1024;
                if (mb >= 1024)
                {
                    break;
                }


                jtw.WriteStartObject();
                jtw.WritePropertyName("FirstName");
                jtw.WriteValue(GetRandomString(5));
                jtw.WritePropertyName("LastName");
                jtw.WriteValue(GetRandomString(5));
                jtw.WritePropertyName("City");
                jtw.WriteValue(GetRandomString(5));
                jtw.WritePropertyName("Company");
                jtw.WriteValue(GetRandomString(5));
                jtw.WritePropertyName("DateOfBirth");
                jtw.WriteValue(GetRandomString(5));
                jtw.WriteEndObject();

                writer.Write(sb.ToString());
                sb.Clear();
                count++;

            }

            jtw.WriteEndArray();
            writer.Write(sb.ToString());
            jtw.Close();
            sw.Close();
            watch.Stop();

            Console.WriteLine($"Written {count} Records In {watch.Elapsed} ");
        }
    }

    public static string GetRandomString(int length)
    {
        var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        return new string(chars.Select(c => chars[_random.Next(chars.Length)]).Take(length).ToArray());
    }
}
```
This resulted in `11 184 822` objects and takes just `3 minutes and 2 seconds` which i am very happy with. Interestingly even though [Wikipedia](https://en.wikipedia.org/wiki/Windows_Notepad) says that the maximum file size that NotePad supports was raised to a gigabyte in Windows 11, and Windows shows the file as exactly one gigabyte, i still get an error saying the file is too big. Similarly, i get an "invalid string length" error in Visual Studio Code and Sublime text just crashes when attempting to open it.

In the next post, we will look at how we can efficiently get these 11 million objects into SQL. Fancy a guess on how long the execution will take ? Leave your thoughts in the comments below.