const express = require('express');
const toolsController = require('../../controllers/v1/tools.controllers');
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

module.exports = router;