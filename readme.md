# Node Island Finder

Finds Islands of Knowledge in Node Git Repositories.


## Dependencies

* Recent-ish version of `node` (tested with `v7.6.0`)
* `git` (tested with `2.9.3`)
* (`github-`)`linguist` (https://github.com/github/linguist/, tested with `v5.0.6`)
* [CouchDB](https://couchdb.apache.org/)
* A Unix system (because of stuff like `mv` and `mkdir`)


## Useage

`npm install` once.

Then generate a report on a repo with the `report` script. The report should be analyzed by a developer to identify Islands of Knowledge.

### report

Useage: `report REPO OUT_DIR` (`REPO` must be absolute)

Combines the scripts of this project to generate a html-report on Islands of Knowledge in `REPO`. The report and all intermediate output artifacts are written to `OUT_DIR`.


### analyze

Useage: `./analyze REPO [OUT_DIR [TREE_ISH [SUBPATH...]]]` (`REPO` must be absolute)

Analyze a node git repository `REPO` at the given revision (`TREE_ISH`, [see here](http://stackoverflow.com/a/18605496)) with an optional whitelist (`SUBPATH...`) and write results in `OUT_DIR`. `OUT_DIR` defaults to `out/`, `TREE_ISH` to `master`.

The result is basically a map of the combination of developer and module to the number of times that developer used that api.


### keywords

The `keywords` script takes the file `out/npm_keywords` with contents of the form

```JSON
{"rows": [
  {"key": "modulename", "value": ["list", "of", "tags"]},
  {"key": "modulename", "value": ["list", "of", "tags"]}
]}
```

Additional keys may be given and will be ignored. The script counts the number of occurrences of each tags and prints the result as a JSON object to STDOUT in the form

```JSON
{"tag_a": 5, "tag_b": 4, "tag_c": 2}
```

Tags with only one occurrence are omitted. Tags are converted to lowercase. Tags will be printed in descending order, but purely numeric tags are prepended in random order (and I don't know why).

One way to generate the input list of keywords is to replicate the [npm registry](https://skimdb.npmjs.com/registry) to a local [CouchDB](https://couchdb.apache.org/) instance and then use a design document/view with the following code to generate the list:

```JavaScript
function(doc) {
  emit(doc.name, doc.keywords || []);
}
```

For example, if you have a **CouchDB** instance with **Futon** installed running at `localhost:5985`, got to `http://localhost:5984/_utils/replicator.html`, choose to *Replicate changes from* a *Remote database* with URL `https://skimdb.npmjs.com/registry` to a *Local database* called `npm-registry` and hit the *Replicate* button. This will take some time. To update your replicate, just do the same thing again, it will only update apply the changes since the last replication. Then go to `http://localhost:5984/_utils/database.html?npm-skim/_temp_view` and paste the code above into the *Map Function* textarea. Push the *Save As...* button and save in *Design Document* `_design/``keywords` under *View Name* `keywords`. After that, you can visit the view at `http://localhost:5984/_utils/database.html?npm-skim/_design/keywords/_view/keywords` in futon or as raw JSON at `http://localhost:5984/npm-skim/_design/keywords/_view/keywords`. You can GET the latter with a tool like **curl** and pipe it to the file `out/npm_keywords` like required above.


### modulesToKeywords

Useage: `./modulesToKeywords IN OUTBASE [KEYWORDSSTATFILE]`.

Takes the CSV report `in` and maps each module to the globally most used keyword from the module's keywords list.

Keywords are read from a local npm-registry replicate at `http://localhost:5984/npm-skim/${baseModuleName}`. Which of the given keywords is most used is detemined by looking up each keywords and the number of it's uses in `KEYWORDSSTATFILE` or `out/keywords_counted.json`, which can be generated by the above `keywords`-script.

The results are written to `OUTBASE.csv` and are equal to `IN`, except they have a row for the keywords prepended. Keywords that have been looked up are written in all-caps. If a module can not be found or if no keywords are given, the module name is returned instead.

A backwards-map from the domains back to the modules and global objects, which it comprises, is written to `OUTBASE_remap.csv`.

A map from modules that have been looked up to all their keywords and their respective counts in the npm-registry is written to `OUTBASE_modulesToKeywords.json`.


### condense

Useage: `./condense IN [OUT]`

Takes the output file of the `modulesToKeywords`-script as a file `IN` and combines columns with the same header (ie module keyword). Removes the second line of the original CSV file (ie the module names). Writes to OUT if given, to stdout otherwise.


### track_author

Useage: `./graph_author AUTHOR USEAGE_JSON...`

Takes a list of the JSON outputs of the `analyze`-script (2nd parameter) and prints to STDOUT a CSV table that tracks the API useages of the specified **author** (1st parameter). For example (spaces inserted for legibility):

```
> ./graph_author turbopope rev1.json rev2.json rev3.json
         , fs, crypto, path, http
rev1.json, 2 , 0     , 10  , 0
rev2.json, 5 , 0     , 2   , 0
rev3.json, 9 , 1     , 0   , 0
```


### track_module

Useage: `./graph_module MODULE USEAGE_JSON...`

Like `graph_author`, but for a module instead of an author.

Takes a list of the JSON outputs of the `analyze`-script (2nd parameter) and prints to STDOUT a CSV table that tracks the API useages of the specified **module** (1st parameter). For example (spaces inserted for legibility):

```
> ./graph_author crypto rev1.json rev2.json rev3.json
         , john, jade, rose, dave
rev1.json, 3   , 0   , 11  , 0
rev2.json, 4   , 0   , 3   , 0
rev3.json, 8   , 2   , 0   , 0
```


### analyze_history

Useage: `./analyze_request_history /path/to/repo/ [out-dir [n [subpath...]]]`

Analyze every `n`th revision of the given repo with `analyze` (defaults to `n=250`). `out-dir` and `subpath...` are the same arguments as for `analyze` and are passed through to it.
