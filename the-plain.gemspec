Gem::Specification.new do |spec|
	spec.name          = "the-plain"
	spec.version       = "4.0.0"
	spec.authors       = ["Taylor Gibb"]
	spec.email         = ["taylor@developerhut.co.za"]

	spec.summary       = "A minimalist Jekyll theme"
	spec.homepage      = "https://github.com/heiswayi/the-plain"
	spec.license       = "MIT"

	spec.metadata["plugin_type"] = "theme"

	spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_sass|(LICENSE|README)((\.(txt|md|markdown)|$)))!i) }

	spec.add_runtime_dependency "jekyll", "~> 4.2.1"

	spec.add_development_dependency "bundler", "~> 2.1.4"
	spec.add_development_dependency "rake", "~> 12.0"
end

