"use strict";
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const rethinkdb = require('rethinkdb');

let db_host = null; // config load is needed to init these
let db_port = null;
let config = {};
let db_process = null;
let db_client = null;

let json_logs = false; // mongod uses JSON logs with version >= 4.4

const DB_NAME = "PAPS";

const RED_COLOR_CODE = "\u001b[31m";
const YELLOW_COLOR_CODE = "\u001b[33m";
const GREEN_COLOR_CODE = "\u001b[32m";
const RESET_COLOR_CODE = "\u001b[0m";

function manage_shutdown(){
	console.log("Shutting down database.");
	// The server is about to be shutdown, cleanly shutdown the database also to prevent data corruption
	db_client.close();
}

function process_logs_from_database(data){
	console.log("[RethingDB]",data);
}

module.exports.setup = (c) => {
	config = c;
	config.db_program = config.db_program || "rethinkdb"; // set default value
	config.db_host = config.db_host || "localhost";
	config.db_port = config.db_port || 27017;
	config.db_path = config.db_path || "./db/";
	config.db_more_arguments = config.db_more_arguments || [];
	db_host = config.db_host;
	db_port = config.db_port;

	// create database folder for first time initialization:
	if(config.db_path === "./db/" && !fs.existsSync(config.db_path)){
		fs.mkdirSync(config.db_path);
		console.log("Created directory "+config.db_path+" for database.");
	}

	console.log("Starting database ...");

	cp.exec(config.db_program+" --version",{cwd:"./back/"}, async (err,stdout,stderr) => {
		if(err){
			console.log(RED_COLOR_CODE+"Unable to start database:"+RESET_COLOR_CODE);
			console.log(err.message);
			console.log("Is it installed ? You can install mongodb using the tutorial provided in README.md");
			console.log("If the database is installed, \"mongod --version\" should print the version installed.")
			process.exit(1);
		}

		let version = stdout.split("\n",2)[0].split("-",2)[0].split(" ")[1];

		console.log("Your rethinkdb version is:",version);

		// database seems to be properly installed.
		let command_line_options = [
			"--no-default-bind",
			"-d", path.join("..",config.db_path),
			"--bind",config.db_host,
			"--driver-port",config.db_port,
			"--cluster-port",config.db_port+1,
			"--http-port",config.db_port+2];

		command_line_options = command_line_options.concat(config.db_more_arguments);

		console.log("Running: "+config.db_program+" "+command_line_options.join(" "));

		db_process = cp.spawn(config.db_program,command_line_options,{cwd:"./back/"});
		
		let databuffer = "";
		db_process.stdout.on('data', (data) => {
			// convert data from buffer to string:
			data = data + "";

			// add data to buffer until a line break is found.
			for(let i = 0;i < data.length;i++){
				if(data[i] == '\n'){
					// process the logs and flush the buffer
					process_logs_from_database(databuffer);
					databuffer = "";
				}else{
					databuffer += data[i];
				}
			}
		});
		db_process.stderr.on('data', (data) => {
			console.error(data+"");
		});
		db_process.on('close', (code) => {
			console.log(`Database process exited with code ${code}`);
			process.exit(0);
		});

		process.on('SIGHUP',manage_shutdown); // called when terminal is closed
		process.on('SIGINT',manage_shutdown); // called when Ctrl-C
		process.on('SIGTERM',manage_shutdown);

		console.log(GREEN_COLOR_CODE+"Database started."+RESET_COLOR_CODE);

		// connect to db.
		rethinkdb.connect({host: db_host, port: db_port}, async (err, connection) => {
			if(err !== null){
				console.log(RED_COLOR_CODE+"Unable to connect to database. Something weird is going on. Read the database logs for more informations."+RESET_COLOR_CODE);
				console.log(err.message);
				process.exit(1);
			}
			console.log(GREEN_COLOR_CODE+"Connected successfully to the database"+RESET_COLOR_CODE);
			db_client = connection;

			if(config.put_fake_data){
				console.log(YELLOW_COLOR_CODE+"Overwriting database with fake data, because put_fake_data=true in config.json"+RESET_COLOR_CODE)
				console.log(YELLOW_COLOR_CODE+"Stop the process if this was an error, you have 5 seconds to do so (use Ctrl-C)"+RESET_COLOR_CODE);
				setTimeout( () => {
					require('../doc/fake_data.js').populate_db(connection,rethinkdb);
				},5 * 1000);
			}
		});
	});

};


function send_error(res,msg){
	res.send({'error':msg});
}

async function listTable(conn,r){
	return new Promise((resolve) => {
		r.tableList().run(conn, (err,result) => {
			resolve({err:err,result:result});
		});
	});
}

module.exports.handle_query = async (req,res) => {
	if(db_client === null){
		send_error(res,"database not ready. Please wait a bit.");
		return;
	}

	if(req.query.type === "recipes"){

		//let tablesInfo = await listTable(db_client,rethinkdb);
		//console.log(tablesInfo.result);

		rethinkdb.table('recipes').run(db_client, function(err, cursor) {
		    if (err) throw err; // todo: handle this better than just throwing

		    cursor.toArray(function(err, result) {
		        if (err){
		        	console.log("An error occured while processing the query: "+req.url);
		        	console.log(err.message);
		        	res.send([]);
		        	return;
		        }
		        res.send(result);
		    });
		});
	}else{
		send_error(res,"type option not recognized");
	}
}