"use strict";

const ASTWalker = require('./ASTWalker');
const execSync = require('child_process').execSync;

class APIUseWalker extends ASTWalker {
  constructor(repo, file) {
    super();
    this._repo = repo;
    this._file = file;
    this._uses = {};
    this._requires = {};

    this.add_watcher('VariableDeclarator', variableDeclarator => {
      // console.dir(variableDeclarator);

      if (
        variableDeclarator.init &&
        variableDeclarator.init.type == 'CallExpression' &&
        variableDeclarator.init.callee.name === 'require'
      ) {
        const vName = variableDeclarator.id.name;
        const required = variableDeclarator.init.arguments[0].value;
        this._requires[vName] = required;
        console.log(`${vName} = require('${required}')`);
      }
    });

    this.add_watcher('CallExpression', callExpression => {
      const callee = callExpression.callee;
      const line = callExpression.loc.start.line;
      const type = callExpression.callee.type;

      let expName = '';

      switch (type) {
        case 'MemberExpression':
          expName = callee.object.name;
          break;
        case 'Identifier':
          expName = callee.name;
          break;
        case 'FunctionExpression':
          expName = '...';
          break;
        case 'CallExpression':
          expName = '...';
          break;
        case 'LogicalExpression':
          expName = '...';
          break;
        case 'NewExpression':
          expName = callee.name;
          break;
        case 'ConditionalExpression':
          expName = '...';
          break;
        case 'MetaProperty':
          expName = '...';
          break;
        case 'Super':
          expName = '...';
          break;
        default:
          throw `Unknown callee: ${callee.type}`;
      }

      const author = this.author(this._repo, this._file, line)
      this.record_use(expName, author);
      // console.log(`${line}: ${type} ${expName} by ${author}`);
    });
  }

  author(repo, file, line) {
    const cmd = `git blame -p -L ${line},${line} ${file}`;
    // console.log(`e xec ${cmd} in ${repo}`);
    const stdout = execSync(cmd, { cwd: repo, encoding: 'utf-8' });
    return stdout.split("\n")[1].replace('author ', '');
  }

  record_use(callee, author) {
    if (!this._uses.hasOwnProperty(callee)) {
      this._uses[callee] = {}
    }
    if (!this._uses[callee].hasOwnProperty(author)) {
      this._uses[callee][author] = 0;
    }
    this._uses[callee][author] = this._uses[callee][author] + 1;
  }

  // Removes all calls on callees that have not been required
  pruneUnrequired() {
    const requires = this._requires;
    const uses = this._uses;
    var requiredAndUsed = {};
    Object.getOwnPropertyNames(requires).forEach(required => {
      if (uses.hasOwnProperty(required)) {
        requiredAndUsed[required] = uses[required];
      }
    });
    this._uses = requiredAndUsed;
  }

  // Removes all requires of local (non-npm) modules
  pruneLocalModuleRequires() {
    Object.getOwnPropertyNames(this._requires).forEach(vName => {
      if (this._requires[vName].startsWith('.')) {
        delete this._requires[vName];
      }
    });
  }

  // Resolves vNames to module names
  normalizeVNamesToModules() {
    Object.getOwnPropertyNames(this._requires).forEach(vName => {
      let required = this._requires[vName];
      let temp = this._uses[vName]; // Clones?
      if (temp === undefined) {
        // TODO: These were probably required for a reason. Investigate why they are not used.
        console.warn(`Unused required module ${vName} = ${required}`);
        return;
      }
      delete this._uses[vName];
      this._uses[required] = temp;
    });
  }

  // Call when all nodes have been handled
  finalize() {
    this.pruneLocalModuleRequires();
    this.pruneUnrequired();
    this.normalizeVNamesToModules();
  }

}


module.exports = APIUseWalker;
