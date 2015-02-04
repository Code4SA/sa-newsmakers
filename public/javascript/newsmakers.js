$(function() {

	Handlebars.registerHelper('since', function(date) {
		date = Handlebars.Utils.escapeExpression(date);
		var result = moment(date).fromNow();

		return new Handlebars.SafeString(result);
	});

	Handlebars.registerHelper('num_format', function(num) {
		num = Handlebars.Utils.escapeExpression(num);
		result = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return new Handlebars.SafeString(result);
	});

	var width = 600,
		height = 650,
		format = d3.format(",d"),
		color = d3.scale.category20c(),
		date_format = d3.time.format("%Y-%m-%d");

	var bubble = d3.layout.pack()
		.sort(null)
		.size([width, height])
		.padding(3)
		.value(function(d) { return d.size })

	var svg = d3.select("#content").append("svg")
		.attr("width", "100%")
		.attr("height", height)
		.attr("class", "bubble");

	var find_min_date = function(docs) {
		return new Date(
			docs.reduce(function(previousValue, currentValue) {
				return ((new Date(previousValue.doc_published_date) < new Date(currentValue.doc_published_date)) ? previousValue : currentValue);
			}).doc_published_date
		);
	}

	var find_max_date = function(docs) {
		return new Date(
			docs.reduce(function(previousValue, currentValue) {
				return ((new Date(previousValue.doc_published_date) > new Date(currentValue.doc_published_date)) ? previousValue : currentValue);
			}).doc_published_date
		);
	}

	d3.csv("dexter.csv", function(err, data) {
		var n = d3.nest()
			.key(function(d) { return d.source_source_name })
			.entries(data);
		var m = n.map(function(d) {
			return Source(d)
		}).filter(function(d) { return d.size > 0; });

		var genders = [];
		var races = [];
		var affiliations = [];
		var affiliation_groups = [];
		var min_date = new Date();
		var max_date = 0;

		m.forEach(function(d) {
			genders.push(d.docs[0].source_gender);
			races.push(d.docs[0].source_race);
			affiliations.push(d.docs[0].source_affiliation);
			affiliation_groups.push(d.docs[0].source_affiliation_group);
			var this_min_date = find_min_date(d.docs);
			var this_max_date = find_max_date(d.docs);
			if (this_min_date < min_date) {
				min_date = this_min_date;
			}
			if (this_max_date > max_date) {
				max_date = this_max_date;
			}
		});
		d3.select("#dateRange")
			.text("Date range for this dataset: " + date_format(min_date) + " to " + date_format(max_date));
		genders = d3.set(genders).values();
		genders.unshift("All")
		races = d3.set(races).values();
		races.unshift("All")
		affiliations = d3.set(affiliations).values();
		affiliations.unshift("All")
		affiliation_groups = d3.set(affiliation_groups).values();
		affiliation_groups.unshift("All")
		var filters = [
			{ name: "Gender", key: "gender", values: genders, value: "All" },
			{ name: "Race", key: "race", values: races, value: "All" },
			// { name: "Affiliation", key: "affiliation", values: affiliations, value: "All" },
			{ name: "Group", key: "affiliation_group", values: affiliation_groups, value: "All" },
		];
		var filter_vals = { gender: "All", race: "All", group: "All" };
		// console.log(m);

		var tooltip = d3.select("body").append("div")
			.attr("class", "tooltip")
			.style("opacity", 0)
			;

		var node = svg.selectAll(".node")
			.data(bubble.nodes({ children: m }).filter(function(d) { return !d.children; }))
		.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
			;
		node.append("circle")
			.attr("r", function(d) { return d.r; })
			.style("fill", function(d) { return color(d.docs[0].source_affiliation_group_code); })
			.attr("data-name", function(d) { return d.name })
			.on("click", function(d) {
				var name = d.name;
				var docs = d.docs;
				var race = d.race;
				var gender = d.gender;
				var affiliation = d.affiliation;
				var affiliation_group = d.affiliation_group;
				var publications = d3.select("#publications")
					.html("");
				publications.append("h3").text(function(d) { return name });
				publications.append("p").append("strong").text(function(d) { return race + " " + gender + ( (affiliation) ? " - " + affiliation : "" ) });
				// publications.append("p").text(function(d) { return affiliation });
				var article = publications.selectAll("div")
					.data(docs)
				.enter()
					.append("div")
					.classed("publication", true);
				article.append("span")
					.text(function(d) { return date_format(new Date(d.doc_published_date)) + " - " });
				article.append("a")
					.attr("href", function(d) { return d.doc_article_url })
					.text(function(d) { return d.doc_title })
					;
				article.append("span")
					.text(function(d) { return " (" + d.doc_author_name + ", " + d.doc_medium + ")"})
				
			})
			.on("mouseover", function(d) {
				tooltip
					.style("opacity", .9)
				;
			})
			.on("mousemove", function(d) {
				tooltip.html(d.name)
					.style("top", (d3.event.pageY - 15) + "px")
					.style("left", (d3.event.pageX + 10) + "px")
					;
			})
			.on("mouseout", function(d) {
				tooltip
					.style("opacity", 0);
			})
			;
		node.append("text")
			.attr("dy", ".3em")
			.style("text-anchor", "middle")
			.text(function(d) { if (d.size > 10) return d.name.split(" ").slice(-1) } )
			;


		var selects = d3.select("#selects")
			.selectAll("select")
			.data(filters)
		.enter()
			.append("div")
			.classed("col-md-2", true);

		selects
			.append("label")
			.classed("form-label", true)
			.text(function(d) { return d.name })
		selects
			.append("select")
			.classed("form-control", true)
			.classed("select_filter", true)
			.attr("id", function(d) { return "select_" + d.key })
			.attr("data-key", function(d) { return d.key })
			.on("change", function() { 
				selectValue = d3.select(this).property('value');
				selectKey = d3.select(this).attr('data-key');
				console.log(selectKey, selectValue);
				filter_vals[selectKey] = selectValue;
				console.log(filter_vals);
				applyFilters();
			})
			.selectAll("option")
			.data(function(d) { return d.values })
		.enter()
			.append("option")
			.attr("value", function(d) { return d })
			.text(function(d) { if (d=="") return "Unknown"; return d })
			;
		

		function applyFilters() {
			svg.selectAll(".node")
				.classed("faded", function(d) { 
					return is_filtered(d);
				});
		}

		function is_filtered(d) {
			var display = true;
			for (key in filter_vals) {
				filter = filter_vals[key];
				if (filter == "All") {
					display = display || false;
				} else {
					if (d[key] !== filter) {
						display = display && false;
					}
				}
			}
			return !display;
		}

		function Source(d) {
			return { name: d.key, size: d.values.length, docs: d.values, gender: d.values[0].source_gender, race: d.values[0].source_race, affiliation: d.values[0].source_affiliation, affiliation_group: d.values[0].source_affiliation_group }
		}

		function fixDate(d) {
			// if ()
		}
	});

	
});