import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { pool, initDb } from "./db.js";
import session from 'express-session';
import { userInfo } from "os";



declare module "express-session" {
    interface SessionData {
        xssOnemogucen: boolean;
        user: {id: number; username: string; role: string};
    }
}


const app = express();


app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));

app.use(session({
    secret: 'tajna_sifra',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: false, sameSite: "lax"},
}));


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());




app.get("/", async (req, res) => {
  if (!req.session.user) {
    res.render("prijava");
  } else {
    const result = await pool.query("SELECT * FROM gallery ORDER BY id DESC");
    res.render("index", { 
        galerija: result.rows,
        xssOnemogucen: req.session.xssOnemogucen ?? false,
        user: req.session.user
    });
  }
});


app.post("/prijaviSe", async (req, res) => {
    const username=req.body.username;
    const passsword=req.body.password;

    const result = await pool.query("SELECT * from users where username=$1 and password=$2", [username, passsword]);
    
    if (result.rows.length > 0) {
        req.session.user = result.rows[0];
        res.redirect("/");
    } else {
        res.status(401).send("Pogrešno korisničko ime ili lozinka.");
    }
});


app.post("/odjava", async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});



app.post("/onemoguciXss", async (req, res) => {
  if (!req.session.user) {
    res.redirect("/");

  } else {
    const xssOnemogucen = req.body.xssCheckbox==="1"; // ako je 1 onemogucen je XSS 
    const user=req.session.user;

    req.session.regenerate((err) => {
        if (err) {
        console.error("Greška prilikom regeneracije sesije:", err);
        return res.status(500).send("Greška prilikom obrade zahteva.");
        }

        req.session.user = user;
        req.session.cookie.httpOnly = xssOnemogucen;
        req.session.xssOnemogucen = xssOnemogucen;
        req.session.save(() => res.redirect("/"));
    });
  }
  
});


app.post("/add-photo", async (req, res) => {
  if (!req.session.user) {
    res.redirect("/");
  } else {
    const link = String(req.body.urlInput ?? "");
    await pool.query("INSERT INTO gallery (link) VALUES ($1)", [link]);
    res.redirect("/");
  }
  
  
});

await initDb();

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => console.log(`Server na portu ${PORT}`));