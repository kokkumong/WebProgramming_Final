const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();

//이미지 저장 관련 툴(multer)
const multer = require("multer");
const path = require("path");



const url =
  "mongodb+srv://jeongkh2001:Jsm77082!@kokkumong.idmif0q.mongodb.net/?retryWrites=true&w=majority&appName=Kokkumong";
const client = new MongoClient(url);
let db;

//이미지 저장 관련(multer 사용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/../public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

//EJS 설정
app.set("view engine", "ejs");
app.set("views", __dirname + "/../views");

//미들웨어
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/css", express.static(__dirname + "/../css"));
app.use("/js", express.static(__dirname + "/../js"));

app.use(express.static(__dirname + "/../public")); // public 폴더 사용 시 경로 수정 추천

//DB 연결 + 서버 시작
async function start() {
  try {
    await client.connect();
    db = client.db("community");
    console.log("✅ MongoDB 접속 성공");

    //서버 시작
    app.listen(3000, () => {
      console.log("🚀 Server is running on http://localhost:3000");
    });
  } catch (err) {
    console.error("❌ MongoDB 연결 실패", err);
  }
}

start();

// 글 저장 API
app.post("/posts", upload.single("image"), async (req, res) => {
  try {
    const { title, category, content } = req.body;

    const imageMatch = content.match(/<img[^>]+src="([^">]+)"/);
    const image = req.file ? "/uploads/" + req.file.filename : null;

    console.log("✅ 추출된 대표 이미지:", image); // ⭐️ 추가

    const post = {
      title,
      category,
      content,
      author: "익명",
      createdAt: new Date(),
      image,
    };

    const result = await db.collection("posts").insertOne(post);
    console.log("✅ 글 저장 완료:", result.insertedId);

    res.redirect("/");
  } catch (err) {
    console.error("글 저장 실패", err);
    res.status(500).send("Internal Server Error");
  }
});

// 글쓰기 페이지 렌더링
app.get("/community_write", (req, res) => {
  res.render("community_write");
});

// 상세 페이지 렌더링
app.get("/posts/:id", async (req, res) => {
  try {
    const post = await db
      .collection("posts")
      .findOne({ _id: new ObjectId(req.params.id) });

    res.render("community_detail", { post });
  } catch (err) {
    console.error("게시글 조회 실패", err);
    res.status(500).send("Internal Server Error");
  }
});

//페이징
app.get("/", async (req, res) => {
  try {
    const perPage = 6; // 페이지당 글 수
    const page = parseInt(req.query.page) || 1; // 현재 페이지

    const totalCount = await db.collection("posts").countDocuments();
    const totalPages = Math.ceil(totalCount / perPage);

    const posts = await db
      .collection("posts")
      .find()
      .sort({ _id: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray();

    console.log(
      `현재 페이지: ${page}, skip: ${(page - 1) * perPage}, limit: ${perPage}`
    );
    console.log(`posts.length: ${posts.length}`);
    posts.forEach((p) => console.log(p._id, p.title));

    res.render("community", {
      posts,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error("게시글 목록 조회 실패", err);
    res.status(500).send("Internal Server Error");
  }
});
