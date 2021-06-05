<!DOCTYPE html>
<html>
  <head>
    <title>Search Sensors</title>
    <link rel="stylesheet" type = "text/css" href="{{{base}}}css/style.css">
  </head>
  <body>
    <h1 class="tst-sensors-search-page">Search Sensors</h1>
    <form method="GET">
		{{#errors}}
			<p></p>
			<ul>
				<li class="error">{{.}}</li>
			</ul>
		{{/errors}}
		{{#sensorInput.0}}
			{{#fields}}
				{{#isSearch}}
					<label for="{{name}}">
						{{friendlyName}}
					</label>
					<div>
						<input name="{{name}}" type="text" value="{{value}}" id="{{name}}" class="tst-{{class}}">
					</div>
				{{/isSearch}}
			{{/fields}}
		{{/sensorInput.0}}
		<label>
		</label>
		<div>
			<input type="submit" value="search">
		</div>
    </form>

	{{#isError}}
		<h2>Results Summary</h2>
		<table class="summary">
			<thead>
			<tr>
				{{#sensors.0.fields}}
					<th {{#attr}} colspan="2" {{/attr}}>{{friendlyName}}</th>
				{{/sensors.0.fields}}
			</tr>
			<tr>
					<th></th>
					<th></th>
					<th></th>
					<th>Min</th>
					<th>Max</th>
			</tr>
			</thead>
			<tbody>
				{{#sensors}}
					<tr>
						{{#fields}}
							{{^isInterval}}					
								<td class="tst-{{class}}">
									{{value}}
								</td>
							{{/isInterval}}
							{{#isInterval}}
								<td class="tst-{{class}}">
									{{value.min}}
								</td>
								<td class="tst-{{class}}">
									{{value.max}}
								</td>
							{{/isInterval}}
						{{/fields}}
					</tr>
				{{/sensors}}
			</tbody>
		</table>
		<div class="scroll">
			{{#sensors.prev}}
				<a class="tst-prev" href="{{sensors.prev}}" rel="prev">&lt;&lt;</a>
			{{/sensors.prev}}
			{{#sensors.next}}
				<a class="tst-next" href="{{sensors.next}}" rel="next">&gt;&gt;</a>
			{{/sensors.next}}
		</div>
	{{/isError}}
    {{>footer}}
  </body>
</html>
