import express from "express";
import path from "path";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3000;


app.set("trust proxy", 1);


app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));


app.get("/", (req, res) => {
  res.render("index");
});



app.listen(PORT, () => console.log(`Server na portu ${PORT}`));