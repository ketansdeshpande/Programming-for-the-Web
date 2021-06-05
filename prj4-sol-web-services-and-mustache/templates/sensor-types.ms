<!DOCTYPE html>
<html>
  <head>
    <title>Search Sensor Types</title>
    <link rel="stylesheet" type = "text/css" href="{{{base}}}css/style.css">
  </head>
  <body>
    <h1 class="tst-sensor-types-search-page">Search Sensor Types</h1>
    <form method="GET">
		{{#errors}}
			<p></p>
			<ul>
				<li class="error">{{.}}</li>
			</ul>
		{{/errors}}
		{{#sensorTypesInput.0}}
			{{#fields}}
				{{^isSelect}}
					{{#isSearch}}
						<label for="{{name}}">
							{{friendlyName}}
						</label>
						<div>
							<input name="{{name}}" type="text" value="{{value}}" id="{{name}}" class="tst-{{class}}">
						</div>
					{{/isSearch}}
				{{/isSelect}}
				{{#isSelect}}
					<label for="{{name}}">
						{{friendlyName}}
					</label>
					<div>
						<select name="{{name}}" id="{{name}}" class="tst-{{class}}">
							{{#choices}}
								<option {{#isChosen}}selected=""{{/isChosen}} value="{{value}}">{{label}}
								</option>
							{{/choices}}
						</select>
					</div>
				{{/isSelect}}
			{{/fields}}
		{{/sensorTypesInput.0}}
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
				{{#sensorTypes.0.fields}}
					<th {{#attr}} colspan="2" {{/attr}}>{{friendlyName}}</th>
				{{/sensorTypes.0.fields}}
			</tr>
			<tr>
				<th></th>
				<th></th>
				<th></th>
				<th></th>
				<th>Min</th>
				<th>Max</th>
			</tr>
			</thead>
			<tbody>
				{{#sensorTypes}}
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
				{{/sensorTypes}}
			</tbody>
		</table>
			<div class="scroll">
				{{#sensorTypes.prev}}
					<a class="tst-prev" href="{{sensorTypes.prev}}" rel="prev">&lt;&lt;</a>
				{{/sensorTypes.prev}}
				{{#sensorTypes.next}}
					<a class="tst-next" href="{{sensorTypes.next}}" rel="next">&gt;&gt;</a>
				{{/sensorTypes.next}}
			</div>
	{{/isError}}
    {{>footer}}
  </body>
</html>
