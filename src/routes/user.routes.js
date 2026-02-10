import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAvator,
  updateAccountDetails,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avator",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser,
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh_token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").post(verifyJWT, getCurrentUser);
router.route("/update-details").patch(verifyJWT, updateAccountDetails);
router.route("/avator").patch(verifyJWT, upload.single("avator"), updateAvator);
router.route("/cover-Image").patch(verifyJWT , upload.single("coverImage") , updateCoverImage)
router.route("/c/:username").get(verifyJWT , getUserChannelProfile);
router.route("/history").get(verifyJWT , getWatchHistory);

export default router;
