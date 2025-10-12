import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import passport from "passport";
import userRoutes from "./routes/userRoutes.js";
import topicRoutes from "./routes/topicRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import cloudinaryConfig from "./config/cloudinaryConfig.js";
import { jwtStrategy } from "./config/passport.js";
import userModel from "./models/userModel.js";

const app = express();
const port = process.env.PORT || 5000;

const mongoDBConnection = async () => {
  mongoose.set("strictQuery", false);
  try {
    await mongoose.connect(process.env.DB);
    console.log(`Connection to Mongo DB established on port: ${port}`);
  } catch (error) {
    console.error("Error connecting to MONGODB", error);
  }
};

const addMiddlewares = () => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const corsOptions = {
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  };

  app.use(cors(corsOptions));
  cloudinaryConfig();

  app.use(passport.initialize());
  passport.use(jwtStrategy);
};

const loadRoutes = () => {
  app.use("/api/users", userRoutes);
  app.use("/api/topics", topicRoutes);
  app.use("/api/comments", commentRoutes);
  app.use("/api/recommendations", recommendationRoutes);
  app.use("/api/announcements", announcementRoutes);
};

const startServer = () => {
  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });
};

const initializeApp = async () => {
  await mongoDBConnection();
  addMiddlewares();
  loadRoutes();
  startServer();
};

initializeApp();