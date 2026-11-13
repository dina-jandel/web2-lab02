import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { pool, initDb } from "./db.js";
import session from 'express-session';
import { userInfo } from "os";



function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Nedostaje environment varijabla: ${name}`);
  }
  return value;
}


declare module "express-session" {
    interface SessionData {
        xssOnemogucen: boolean;
        brokenAccessControlOnemogucen: boolean;
        user: {id: number; username: string; role: string};
    }
}


const app = express();


app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

app.use(session({
    secret: requireEnv("SECRET"),
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: false, sameSite: "lax"},
    })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());





app.get("/", async (req, res) => {
  if (!req.session.user) {
    res.render("prijava", {
        xssOnemogucen: req.session.xssOnemogucen ?? false,
        brokenAccessControlOnemogucen: req.session.brokenAccessControlOnemogucen ?? false
    });
  } else {
    if (req.session.user.role === "admin") {
        const result = await pool.query("SELECT * FROM users");
        res.render("admin", { 
            korisnici: result.rows,
            user: req.session.user,
            xssOnemogucen: req.session.xssOnemogucen ?? false,
            brokenAccessControlOnemogucen: req.session.brokenAccessControlOnemogucen ?? false
        });
    } else {
        const result = await pool.query("SELECT * FROM gallery ORDER BY id DESC");
            res.render("index", { 
            galerija: result.rows,
            xssOnemogucen: req.session.xssOnemogucen ?? false,
            brokenAccessControlOnemogucen: req.session.brokenAccessControlOnemogucen ?? false,
            user: req.session.user
        });
    }
    
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





// kad se klikne na neki od checkboxa za "paljenje/gašenje" ranjivosti
app.post("/postavke", (req, res) => {
  const xssOnemogucen = req.body.xssCheckbox === "1";
  const backOnemogucen = req.body.backCheckbox === "1";
  const user = req.session.user; // undefined ako nije prijavljen

  req.session.regenerate((err) => {
    if (err) {
      console.error("Greška prilikom regeneracije sesije:", err);
      return res.status(500).send("Greška prilikom obrade zahtjeva.");
    }

    if (user) req.session.user = user;
    req.session.xssOnemogucen = xssOnemogucen;
    req.session.brokenAccessControlOnemogucen = backOnemogucen;
    req.session.cookie.httpOnly = xssOnemogucen;
    req.session.save(() => res.redirect("/"));
  });
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




app.get("/admin", async (req, res) => {
    if (req.session.brokenAccessControlOnemogucen) {
        if (!req.session.user || req.session.user.role !== "admin") {
            //res.status(403).send("Pristup zabranjen.");
            res.redirect("/");
        } else {
            const result = await pool.query("SELECT * FROM users");
            res.render("admin", { 
                korisnici: result.rows,
                user: req.session.user,
                xssOnemogucen: req.session.xssOnemogucen ?? false,
                brokenAccessControlOnemogucen: req.session.brokenAccessControlOnemogucen ?? false
            });
        }
    } else {
        const result = await pool.query("SELECT * FROM users");
        res.render("admin", { 
            korisnici: result.rows,
            xssOnemogucen: req.session.xssOnemogucen ?? false,
            brokenAccessControlOnemogucen: req.session.brokenAccessControlOnemogucen ?? false
        });
    }
});

await initDb();

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => console.log(`Server na portu ${PORT}`));