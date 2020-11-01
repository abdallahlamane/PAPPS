// This file contains some fake data to populate the database.
// It is also used as documentation for what the database looks like.

let rw = require('../back/rethink_wrapper.js');

// Warning, this function override the content of the database !
module.exports.populate_db = async (r) => {

	// --------------------------------------------------
	// recipes related
	await rw.deleteTable("recipes",r); // ignore errors if the table does not exist, this is a setup function
	await rw.createTable("recipes",r);


	const recipe1 = {
		recipeid:0,
		creatorid:1,
		creation_time:new Date(), // new Date() creates a date representing the current time
		title:"Frites",
		description:"Des frites croutillantes pour vos soirées entre amis.",
		tags:["Vegan","Gras","Patate"],
		ingredients:["Pommes de terre","Huile de colza","Sel"],
		rating:5,
		public:true,
		content:"Faire frire les <b>patates</b> et c'est prêt :)",
		comments:[
			{
				userid:0, // userid
				content:"J'aime beaucoup, merci pour cette recette."
			}
		]
	};

	await rw.insert(recipe1,"recipes",r);

	const recipe2 = {
		recipeid:1,
		creatorid:0,
		creation_time:new Date(), // new Date() creates a date representing the current time
		title:"Glace à la vanille",
		tags:["Dessert","vanille","sucré"],
		description:"Une glace à la vanille, idéal à déguster en été !",
		public:true,
		ingredients:["Crème fraiche","Sucre roux","Extrait de vanile"],
		rating:4,
		content:"1. Tout mélanger <br/> 2. Mettre au réfrigérateur pendant 30 minutes",
		comments:[
			{
				userid:1, // userid
				content:"Je conseille de laisse au frigo plutôt 45 minutes"
			}
		]
	};

	await rw.insert(recipe2,"recipes",r);


	// ----------------------------------------------------------
	// user related
	await rw.deleteTable("users",r);
	await rw.createTable("users",r);

	const user1 = {
		userid:0,
		rights:"admin",
		name:"Augustus René Le Comte du Château",
		shopping_lists:[
			{
				name:"Banquet de Pâques",
				content:[
					"Saumon",
					"Pain",
					"Tomates"
				]
			},
			{
				name:"Repas de dimanche",
				content:[
					"Huile d'olive",
					"Mozzarella"
				]
			}
		]
	};

	await rw.insert(user1,"users",r);

	const user2 = {
		userid:0,
		rights:"view",
		name:"Hervé Des Champs Des Bois",
		shopping_lists:[
			{
				name:"Principale",
				content:[
					"Chocolat Noir",
					"Crème fraîche"
				]
			}
		]
	};

	await rw.insert(user2,"users",r);

	// More tables will be required based on the features we'll need.

	console.log("Database overwritten. Fake data added.");
}