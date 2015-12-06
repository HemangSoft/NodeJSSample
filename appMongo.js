var express = require('express');
var app= express();
var request = require("request");
var cheerio = require("cheerio");
var mongoose = require('mongoose');

var orderPageURL = new mongoose.Schema({
    PageLink: String
});

var OrderInformation = new mongoose.Schema({
    OrderNumber : String,
    OrderDate : String,
    ExpectedDeliveryDate : String,
    StoreNo : String,
    AccountNo : String,
    SubTeam : String,
    Buyer: String,
    OrderProduct: [{
        Line: Number,
        ItemNo: String,
        Qty: String,
        UPC: String
    }]
})

//Initialise database
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

//Create tables schema here
mongoose.model('OrderPageURL', orderPageURL);
mongoose.model('OrderInformation', OrderInformation);


app.get('/',function(req,res){
    res.send('hello express test');
});

app.get('/getAllLink/',function(req,res){
   var url = "http://www.yourwebsite.com/hemangtest/";
   request(url, function (error, response, htmlBody) {
	if (!error && response.statusCode == 200) {
	    var $ = cheerio.load(htmlBody);

		var allPageLinks = [];
		var allATag = $("table tr > td > a").html();
		$('table tr > td > a').each(function (i, element) {
		  var objPage = {};
		  var linkHref = $(this).attr("href").toLowerCase();
		  
		  if (linkHref.indexOf(".html") > 0) {
		      objPage.PageLink = url + $(this).attr("href");
		      allPageLinks.push(objPage);
		  }
		});
        
		GetEachPageInformation(allPageLinks);

		res.send("All Files in progress");
	}
	else 
	{
		res.send("We’ve encountered an error: " + error);
	}
 });
});


app.get('/getAllOrderInformation/', function (req, res) {
    mongoose.model('OrderPageURL').find(function (err, pagelinks) {
        var arrPages = JSON.parse(JSON.stringify(pagelinks));

        GetEachPageInformation(arrPages);
    });
    res.send('done');
});
   
app.get('/viewOrders/', function (req, res) {
    mongoose.model('OrderInformation').find(function (err, orders) {
        res.send(orders);
    });
});

function GetEachPageInformation(arrPages)
{
    //Clear old data
    mongoose.model('OrderInformation').remove().exec();

    arrPages.forEach(function (objPage) {
        request(objPage.PageLink, function (error, response, htmlBody) {
            if (!error && response.statusCode == 200) {
                GetOrderInformation(htmlBody);
            }
            else {
                console.log("We’ve encountered an error: " + error);
            }
        });
    });

}

function GetOrderInformation(htmlBody)
{
    var $ = cheerio.load(htmlBody);

    var PONumberTitle = $("h1").eq(0).text();
    if (PONumberTitle.indexOf("Purchase Order") > 0) {
        PONumberTitle = PONumberTitle.substring(PONumberTitle.indexOf("Purchase Order"));
    }
    var orderNumber = '';
    var orderDate = '';
    var expectedDeliveryDate = '';
    var storeNo = '';
    var accountNo = '';
    var subTeam = '';
    var buyer = '';

    var scrapResult = [];
    $("table table").eq(0).find("tr").each(function (i, element) {
        var tdFirst = $(this).find("td").eq(0);
        var tdText = $(tdFirst).text().trim().toLowerCase();
        switch (tdText) {
            case "order number:":
                orderNumber = $(tdFirst).next().text();
                break;
            case "order date:":
                orderDate = $(tdFirst).next().text();
                break;
            case "expected delivery date:":
                expectedDeliveryDate = $(tdFirst).next().text();
                break;
            case "store no:":
                storeNo = $(tdFirst).next().text();
                break;
            case "account no:":
                accountNo = $(tdFirst).next().text();
                break;
            case "subteam:":
                subTeam = $(tdFirst).next().text();
                break;
            case "buyer:":
                buyer = $(tdFirst).next().text();
                break;
        }
    });

    var arrProducts = [];
    //var allATag = $("table tr > td > a").html();
    $("table[width='90%'] tr").each(function (i, element) {
        if (i > 0) //Header row
        {
            var lineNo = $(this).find("td").eq(0).text().trim();
            var ItemNo = $(this).find("td").eq(1).text();
            var qty = $(this).find("td").eq(2).text();
            var upcNo = $(this).find("td").eq(6).text();

            if (!isNaN(lineNo) && lineNo != '')
            {
                var productData = {
                    Line: parseInt(lineNo),
                    ItemNo: ItemNo,
                    Qty: qty,
                    UPC: upcNo
                };

                arrProducts.push(productData);
            }
        }
    });

    scrapResult = {
        OrderNumber: orderNumber,
        OrderDate: orderDate,
        ExpectedDeliveryDate: expectedDeliveryDate,
        StoreNo: storeNo,
        AccountNo: accountNo,
        SubTeam: subTeam,
        Buyer: buyer,
        OrderProduct: arrProducts
    };

    //res.send(scrapResult);
    mongoose.model('OrderInformation').create(scrapResult, function (err, blob) {
        if (err) {
            res.send("There was a problem adding the Order information to the database.");
        } else {
            //Order main url saved
            console.log(scrapResult);
        }
    });

}

var server= app.listen(3000,function(){
  console.log('listing on port 3000');
});