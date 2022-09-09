let count = 0;
module.exports.viewCount = (req, res, next) => { 
    count++;
    console.log(count);
    // res.send("Request send")
    next();
}