<!DOCTYPE html>
<html>
  <head>
    <title>Create / Update Sensor Types</title>
    <link rel="stylesheet" type = "text/css" href="{{{base}}}css/style.css">
  </head>
  <body>
    <h1 class="tst-sensor-types-search-page">Create / Update {{#sensorTypes}}Sensor Types{{/sensorTypes}} {{#sensor}}Sensors{{/sensor}}</h1>
    <form method="POST">
		{{#errors}}
			<p></p>
			<ul>
				<li class="error">{{.}}</li>
			</ul>
		{{/errors}}
		{{#sensorTypes}}
			{{#fields}}
				{{^isInterval}}
					{{^isSelect}}
						<label for="{{name}}">
							{{friendlyName}} {{#isRequired}}*{{/isRequired}}
						</label>
						<div>
							<input name="{{name}}" type="text" value="{{value}}" id="{{name}}" class="tst-{{class}}">
							{{#errorMessage}}<div class="error">{{.}}</div>{{/errorMessage}}
						</div>
					{{/isSelect}}
					{{#isSelect}}
						<label for="{{name}}">
							{{friendlyName}} {{#isRequired}}*{{/isRequired}}
						</label>
						<div>
							<select name="{{name}}" id="{{name}}" class="tst-{{class}}">
								{{#choices}}
									<option {{#isChosen}}selected=""{{/isChosen}} value="{{value}}">{{label}}
									</option>
								{{/choices}}
							</select>
							{{#errorMessage}}<div class="error">{{.}}</div>{{/errorMessage}}
						</div>
					{{/isSelect}}
				{{/isInterval}}
				{{#isInterval}}
					<label for="{{name}}">
						{{friendlyName}} {{#isRequired}}*{{/isRequired}}
					</label>
					<div>
						<div id="{{name}}" class="numeric interval">
						{{#attr}}
							<label for="{{label}}">{{friendlyName}}</label>
							<div>
								<input name="limits[{{name}}]" id="{{class}}" value="{{value}}" class="tst-{{class}}">
							</div>
						{{/attr}}
						</div>
						{{#errorMessage}}<div class="error">{{.}}</div>{{/errorMessage}}
					</div>
				{{/isInterval}}
			{{/fields}}
		{{/sensorTypes}}

		{{#sensor}}
			{{#fields}}
				{{^isInterval}}
					<label for="{{name}}">
						{{friendlyName}} {{#isRequired}}*{{/isRequired}}
					</label>
					<div>
						<input name="{{name}}" type="text" value="{{value}}" id="{{name}}" class="tst-{{class}}">
						{{#errorMessage}}<div class="error">{{.}}</div>{{/errorMessage}}
					</div>
				{{/isInterval}}
				{{#isInterval}}
					<label for="{{name}}">
						{{friendlyName}} {{#isRequired}}*{{/isRequired}}
					</label>
					<div>
						<div id="{{name}}" class="numeric interval">
						{{#attr}}
							<label for="{{label}}">{{friendlyName}}</label>
							<div>
								<input name="expected[{{name}}]" id="{{class}}" value="" class="tst-{{class}}">
							</div>
						{{/attr}}
						</div>
						{{#errorMessage}}<div class="error">{{.}}</div>{{/errorMessage}}
					</div>
				{{/isInterval}}
			{{/fields}}
		{{/sensor}}
		<label>
		</label>
		<div>
			<input type="submit" value="add">
		</div>
    </form>
    {{>footer}}
  </body>
</html>
