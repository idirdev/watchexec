# watchexec

> **[EN]** Watch files for changes and automatically execute commands.
> **[FR]** Surveiller les fichiers et executer automatiquement des commandes a chaque modification.

---

## Features / Fonctionnalites

**[EN]**
- Watch files/directories for changes (create, modify, delete)
- Execute any shell command on change
- Glob pattern filtering (e.g., `*.js`, `src/**/*.ts`)
- Debounce to avoid rapid re-execution
- Recursive directory watching
- Clear screen option before each run
- Ignore patterns support

**[FR]**
- Surveiller les fichiers/repertoires pour les changements (creation, modification, suppression)
- Executer n'importe quelle commande shell a chaque changement
- Filtrage par motif glob (ex: `*.js`, `src/**/*.ts`)
- Anti-rebond pour eviter les re-executions rapides
- Surveillance recursive des repertoires
- Option d'effacement d'ecran avant chaque execution
- Support des motifs d'exclusion

---

## Installation

```bash
npm install -g @idirdev/watchexec
```

---

## CLI Usage / Utilisation CLI

```bash
# Watch current dir, run tests on change
watchexec --cmd "npm test"

# Watch specific directory with filter
watchexec --dir ./src --ext js,ts --cmd "node build.js"

# With debounce (500ms)
watchexec --cmd "make build" --debounce 500

# Help
watchexec --help
```

### Example Output / Exemple de sortie

```
$ watchexec --dir ./src --ext js --cmd "npm test"
[watchexec] Watching ./src for *.js changes...
[watchexec] Change detected: src/utils.js (modified)
[watchexec] Running: npm test
  12 tests passed, 0 failed
[watchexec] Change detected: src/index.js (modified)
[watchexec] Running: npm test
  12 tests passed, 0 failed
```

---

## API (Programmatic) / API (Programmation)

```js
const { Watcher } = require('watchexec');

const watcher = new Watcher({
  dir: './src',
  extensions: ['js', 'ts'],
  ignore: ['node_modules'],
  debounce: 300
});

watcher.on('change', (file, event) => {
  console.log(file, event); // 'src/index.js', 'modify'
});

watcher.start();
// watcher.stop() when done
```

---

## License

MIT - idirdev
