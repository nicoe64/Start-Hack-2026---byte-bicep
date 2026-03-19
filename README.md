# byte-bicep — Start Hack 2026

## Setup

```bash
python3.11 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
pip install -r requirements.txt
```



## Starting Frontend
```bash
Install: https://nodejs.org/en/download
You have to open a new console and test with | npm -version
cd Frontend
npm install
npm run dev
```
## Starting Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
## Git

**Push**
```bash
git add .
git commit -m "dein message"
git push
```

**Pull**
```bash
git pull
```

**Branch**
```bash
# neuen branch erstellen + wechseln
git checkout -b mein-feature

# branch pushen
git push -u origin mein-feature

# branch wechseln
git checkout main
```

**Typischer Workflow**
1. `git checkout -b mein-feature`
2. code schreiben
3. `git add . && git commit -m "..."`
4. `git push -u origin mein-feature`
5. Pull Request auf GitHub aufmachen → mergen

## Git

**Push**
```bash
git add .
git commit -m "dein message"
git push
```

**Pull**
```bash
git pull
```

**Branch**
```bash
# neuen branch erstellen + wechseln
git checkout -b mein-feature

# branch pushen
git push -u origin mein-feature

# branch wechseln
git checkout main
```

**Typischer Workflow**
1. `git checkout -b mein-feature`
2. code schreiben
3. `git add . && git commit -m "..."`
4. `git push -u origin mein-feature`
5. Pull Request auf GitHub aufmachen → mergen

## Git

**Push**
```bash
git add .
git commit -m "dein message"
git push
```

**Pull**
```bash
git pull
```

**Branch**
```bash
# neuen branch erstellen + wechseln
git checkout -b mein-feature

# branch pushen
git push -u origin mein-feature

# branch wechseln
git checkout main
```

**Typischer Workflow**
1. `git checkout -b mein-feature`
2. code schreiben
3. `git add . && git commit -m "..."`
4. `git push -u origin mein-feature`
5. Pull Request auf GitHub aufmachen → mergen
