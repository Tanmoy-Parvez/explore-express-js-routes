const express = require('express');
const toolsController = require('../../controllers/v1/tools.controllers');
const { viewCount } = require('../../middleware/viewCount');
const reqLimiter = require('../../middleware/reqLimiter');
const router = express.Router();

/* router.get("/", (req, res) => { 
    res.send("Get all tools from server")
})

router.get("/:id", (req, res) => {
    res.send("Get na tool by id")
})

router.post("/", (req, res) => { 
    res.send("Create a new tool")
}) */

router.route("/")
    .get(toolsController.getAllTools)

    .post(toolsController.saveATool)

router.route("/:id").get(viewCount, reqLimiter, toolsController.getAllToolsById)


module.exports = router;