# Jäsenrekisteri-backend
Jäsenrekisteri backend API Asteriski ry:n tarpeisiin / Membership register backend API for Asteriski ry

React frontend is here <https://github.com/asteriskiry/jasenrekisteri-frontend>.

### Tech
- Node.js
- Passport
- Express.js
- MongoDB

### Start
Install node.js, npm and MongoDB. Start MongoDB with `systemctl start mongodb` or `mongod`.
```bash
git clone https://github.com/asteriskiry/jasenrekisteri-backend.git
cd jasenrekisteri-backend
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
