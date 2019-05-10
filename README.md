# Jäsenrekisteri

### This branch contains old app with viewengine

Jäsenrekisteri Asteriski ry:n tarpeisiin / Membership register for Asteriski ry

### Tech
- Node.js
- React
- Passport
- Express.js
- MongoDB
- Bootstrap 4

### Start
Install node.js, npm and MongoDB. Start MongoDB with `systemctl start mongodb` or `mongod`.
```bash
git clone https://github.com/asteriskiry/jasenrekisteri.git
cd jasenrekisteri
cp .env-sample .env
npm install
npm start
```
Configure `.env`-file if needed. You can use `npm run-script watch` instead of `npm start` to watch file changes with nodemon.

You can make admin account with:
```bash
npm run-script create-user
```

---
© Asteriski ry
