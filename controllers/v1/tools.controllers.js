module.exports.getAllTools = (req, res) => {
    res.send("Get all tools from server")
}

module.exports.getAllToolsById = (req, res) => { 
    res.send("Get all tools by id")

}

module.exports.saveATool = (req, res) => {
    res.send("Create a new tool")
}

