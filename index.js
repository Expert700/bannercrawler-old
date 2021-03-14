const request = require("request-promise");
const parser = require("node-html-parser");

let cookies = {};

function buildCookieStr() {
    let cookieStr = "";

    Object.keys(cookies).forEach((key) => {
        if (cookies[key] !== "") {
            cookieStr += key + "=";
            cookieStr += cookies[key] + "; "
        }
    });

    return cookieStr;
}

function setCookiesFromHeaders(headers) {
    for (let i = 0; i < headers.length; i++) {
        let cookie = headers[i].split(";")[0];

        let name = cookie.split("=")[0];
        let value = cookie.split("=")[1];
        cookies[name] = value;
    }
}

function parseTranscriptHTML(data) {
    let courses = [];
    let root = parser.parse(data);
    let tableElements = root.childNodes[1].childNodes;

    let readingCourses = false;
    for (let i = 0; i < tableElements.length; i++) {
        let element = tableElements[i];

        if (element.innerHTML === undefined) {
            continue;
        }

        if (readingCourses) {
            if (element.innerHTML.includes("Attempt") || element.innerHTML.includes("Term Totals") || element.innerText.length === 8) {
                readingCourses = false;
            } else {
                let department = element.childNodes[1].innerText;
                let code = element.childNodes[3].innerText;

                courses.push({
                    dep: department,
                    code: code
                })
            }
        } else if (element.innerHTML.includes("Subject")) {
            readingCourses = true;
        }
    }

    return courses;
}

async function getTranscriptForUser(username, password) {
    let response = await request({
        uri: "https://bannerweb.wpi.edu/pls/prod/twbkwbis.P_WWWLogin",
        resolveWithFullResponse: true
    });
    setCookiesFromHeaders(response.headers["set-cookie"]);

    response = await request({
        method: "post",
        uri: "https://bannerweb.wpi.edu/pls/prod/twbkwbis.P_ValLogin",
        form: {
            "sid": username,
            "PIN": password
        },
        headers: {
            "Cookie": buildCookieStr(),
            "Host": "bannerweb.wpi.edu",
            "Origin": "https://bannerweb.wpi.edu",
            "Referer": "https://bannerweb.wpi.edu/pls/prod/twbkwbis.P_WWWLogin",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-User": "?1",
            "Sec-Fetch-Dest": "document"
        },
        resolveWithFullResponse: true
    });
    setCookiesFromHeaders(response.headers["set-cookie"]);

    response = await request({
        method: "post",
        uri: "https://bannerweb.wpi.edu/pls/prod/bwskotrn.P_ViewTran",
        form: {
            "levl": null,
            "tprt": "01"
        },
        headers: {
            "Cookie": buildCookieStr(),
            "Host": "bannerweb.wpi.edu",
            "Origin": "https://bannerweb.wpi.edu",
            "Referer": "https://bannerweb.wpi.edu/pls/prod/bwskotrn.P_ViewTermTran",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-User": "?1",
            "Sec-Fetch-Dest": "document"
        },
        resolveWithFullResponse: true
    })

    return parseTranscriptHTML(response.body);
}


exports.crawl = async (req, res) => {
    let courses = await getTranscriptForUser(req.body.sid, req.body.PIN);
    res.status(200).send(courses);
};
