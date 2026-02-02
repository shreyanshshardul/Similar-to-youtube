import mongoose from "mongoose";
import { app } from "./app.js";
import { DB_NAME } from "./constants.js";

const PORT = process.env.PORT || 8000;

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });

  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
})();
