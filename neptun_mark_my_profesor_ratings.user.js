// ==UserScript==
// @name           Neptun Mark My Professor Ratings
// @namespace      http://tampermonkey.net/
// @version        0.1.0
// @downloadURL    https://github.com/UnicodeError0041/neptun-mark-my-professor-ratings/raw/main/neptun_mark_my_professor_ratings.js
// @updateURL      https://github.com/UnicodeError0041/neptun-mark-my-professor-ratings/raw/main/neptun_mark_my_professor_ratings.js
// @description    Shows lecturer ratings in Neptun from www.markmyprofessor.com
// @icon           https://i.imgur.com/QShZWua.png
// @author         UnicodeError0041
// @include        https://*neptun*/*hallgato*/*
// @include        https://*neptun*/*Hallgatoi*/*
// @include        https://*neptun*/*oktato*/*
// @include        https://*hallgato*.*neptun*/*
// @include        https://*oktato*.*neptun*/*
// @include        https://netw*.nnet.sze.hu/hallgato/*
// @include        https://nappw.dfad.duf.hu/hallgato/*
// @include        https://host.sdakft.hu/*
// @include        https://neptun.ejf.hu/ejfhw/*
// @include        https://www.markmyprofessor.com/en/schools*
// @include        https://www.markmyprofessor.com/hu/schools*
// @include        https://www.markmyprofessor.com/schools*
// @include        https://www.markmyprofessor.com/iskola*
// @include        https://www.markmyprofessor.com/en/iskola*
// @include        https://www.markmyprofessor.com/hu/iskola*
// @grant          GM.xmlHttpRequest
// @grant          GM.addStyle
// @grant          GM.notification
// @grant          GM.registerMenuCommand
// @grant          GM.openInTab
// @grant          GM.setValue
// @grant          GM.getValue
// @grant          GM.addValueChangeListener
// @grant          unsafeWindow
// @grant          window.onurlchange
// ==/UserScript==


const SITE = "https://www.markmyprofessor.com";
const SEARCH_SITE = SITE + "/search?q=";

const UPDATED_MARK_ATTR = "already_updated_mark";
const TO_UPDATE_MARK_ATTR = "to_update_mark";

class Row{

    constructor(name, department, rating, link){
        this.name = name;
        this.department = department;
        this.rating = rating;
        this.link = link
    }

    toNode(){
        let returned = document.createElement("div");

        let name = document.createElement("a");
        name.href = this.link;
        name.target = "_blank";
        name.innerText = this.name;

        let score = document.createElement("span");
        score.innerText = `⭐${this.rating}`;

        returned.appendChild(name);
        returned.appendChild(score);

        returned.classList.add("ratedNameRow");

        //returned.setAttribute("IsRow", true);
        return returned;
    }
}


// == Web Scraping ==

function IsLecturerString(str){
    return str === "Oktatók" || str === "Lecturers" || str === "Lehrkräfte" || str === "Tárgyfelelős:" || str === "Responsible lecturer:" || str === "Verantwortliche für das Fach:";
}

function GetNameInURL(name){
    let names = name.replaceAll("Dr.", "").split(" ");
    return (names[0] + " " + names[1]).replaceAll(" ", "%20");
}

function GetFullURL(name){
    return SEARCH_SITE + GetNameInURL(name)
}

function GetRelevantDivsFromXML(xmlDoc){
    let main = xmlDoc.getElementsByTagName("main")[0];
    let returned = []
    try{
       returned = Array.from(main.firstChild.lastChild.lastChild.lastChild.childNodes);
    } catch (err){
        if (err.name === "TypeError"){
            return returned;
        }
        throw err;
    }
    
    returned.shift();
    return returned;
}

function GetRowFromDiv(div){
    let firstDiv = div.firstChild

    let name = firstDiv.textContent
    let link = SITE + firstDiv.attributes.href.nodeValue
    let department = div.childNodes[1].textContent;
    let rating = div.lastChild.lastChild.textContent;

    return new Row(name, department, rating, link);
}

function GetRowsFromDivs(divs){
    return divs.map(GetRowFromDiv);
}

function GetRowsFromXML(xmlDoc){
    let divs = GetRelevantDivsFromXML(xmlDoc);
    return GetRowsFromDivs(divs);
}

async function GetRelevantRow(rows, name){
    if (rows.length === 0){
        return null;
    }

    let firstName = name.split(" ")[0];
    for (let dep of await GetDepartments()){
        let returned = rows.find((row) => row.department === dep && row.rating != "0.00" && row.name.split(" ")[0] === firstName);

        if (returned !== undefined){
           return returned;
        }
    }

    return null;
}

function testRequest(){

    GM.xmlHttpRequest({
        method: "GET",
        url: GetFullURL("Nagy"),
        onload: function(response) {
            if (response.status === 200) {
                console.log(GetRowsFromXML(response.responseXML));
            } else {
                console.error("Error fetching HTML: " + response.statusText);
            }
        },
        onerror: function(error) {
            console.error("Error fetching HTML: " + error);
        }
    })
}

function UpdateName(name){
    let fullUrl = GetFullURL(name);
    //return;
    //console.log(fullUrl);
    GM.xmlHttpRequest({
        method: "GET",
        url: fullUrl,
        onload: async function(response) {
            if (response.status === 200) {
                let rows = Array.from(GetRowsFromXML(response.responseXML));
                let relevantRow = await GetRelevantRow(rows, name);

                if (relevantRow === null){
                    return;
                }

                ReplaceNames(document, name, relevantRow);
            } else {
                console.error("Error fetching HTML: " + response.statusText);
            }
        },
        onerror: function(error) {
            console.error("Error fetching HTML: " + error);
        }
    })
}


//==Getting Teacher Names==

function GetAffectedTableCells(){
    let returned = [];

    let tables = document.querySelectorAll(".table_body.responsive");
    //console.log(tables)
    for (let table of tables){
        // continue;
        let ind = 0;
        let inds = [];
        for (let col of table.querySelectorAll("span")){
            if (IsLecturerString(col.innerHTML)){
                //col.style = "background: red;"
                inds.push(ind);
            }
            ind++;
        }

        for (let row of table.querySelector("tbody").childNodes){
            //console.log({row, inds});
            for (let i = 0; i < inds.length; i++){
                let cell = row.querySelectorAll("td")[inds[i] + 1];

                if (cell === undefined){
                    continue
                }

                //cell.style = "color: red;";

                if (!cell.hasAttribute(UPDATED_MARK_ATTR)){
                    returned.push(cell);
                }
            }
        }
    }
    return returned;
}

function GetAffectedSpans(){
    let returned = [];

    let tableRowNames = document.querySelectorAll("span.tableRowName");

    for (let el of tableRowNames){
        if (!IsLecturerString(el.innerHTML)){
            continue
        }

        //el.style = "color:red";
        //el.nextElementSibling.style = "color:red";

        if (!el.hasAttribute(UPDATED_MARK_ATTR)){
            returned.push(el.nextElementSibling);
        }
    }
    return returned;
}

function GetAffectedElements(){
   let returned = GetAffectedTableCells().concat(GetAffectedSpans());

    for (let el of returned){
        el.setAttribute(TO_UPDATE_MARK_ATTR, true);
    }
    return returned;
}

function GetNamesFromElements(elements){
    let returned = [];

    for (let element of elements){
        if (element.firstChild === null){
            continue;
        }
        returned = returned.concat(element.firstChild.textContent.replaceAll("\n", "").split(","));
    }

    return [... new Set(returned.map((s) => s.trim()))];
}

// == Updating Teacher Names==

async function UpdateNames(){
    let names = GetNamesFromElements(GetAffectedElements())

    if (await NoDepartments() && names.length > 0){

        if (await GM.getValue("started", true) && !IsOnMarkMyProfessorPage()){
            GM.notification({
                text: "Please select relevant department(s) from your school(s) by clicking here.",
                title: "Unable to display lecturer ratings",
                url: 'https://www.markmyprofessor.com/en/schools',
                image : "https://i.imgur.com/QShZWua.png",
                timeout: 70000,
            });

            GM.setValue("started", false);
        }
        return;
    }

    for (let name of names){
        UpdateName(name);
    }
}

function ReplaceNamesFromCells(cellHolder, name, ratedName) {
    for (let cell of cellHolder.querySelectorAll("td")){
        let textEl = cell.firstChild

        if (textEl === null || !textEl.textContent.includes(name) || !cell.hasAttribute(TO_UPDATE_MARK_ATTR) || textEl.nodeType != Node.TEXT_NODE || cell.innerHTML.replace(textEl.textContent, "").includes(name)){
            continue;
        }

        //console.log(`Updating name ${name} to ${ratedName} in ${cell}`)
        textEl.textContent = textEl.textContent.replace(new RegExp(`${name},?`), "");
        cell.appendChild(ratedName.toNode());
        cell.setAttribute(UPDATED_MARK_ATTR, true);
    }
};

function ReplaceNamesFromSpans(spanHolder, name, ratedName){
    for (let span of spanHolder.querySelectorAll("span.tableRowData")){
        let textEl = span.firstChild

        if (textEl === null || !textEl.textContent.includes(name) || !span.hasAttribute(TO_UPDATE_MARK_ATTR) || textEl.nodeType != Node.TEXT_NODE || span.innerHTML.replace(textEl.textContent, "").includes(name)){
            continue;
        }

        //console.log(`Updating name ${name} to ${ratedName} in ${cell}`)
        textEl.textContent = textEl.textContent.replace(new RegExp(`${name},?`), "");
        span.appendChild(ratedName.toNode());
        span.setAttribute(UPDATED_MARK_ATTR, true);
    }
}

function ReplaceNames(elementHolder, name, ratedName){
    ReplaceNamesFromSpans(elementHolder, name, ratedName);
    ReplaceNamesFromCells(elementHolder, name, ratedName);
}


//==Department Selection==

async function GetDepartments(){
    let returned = await GM.getValue("departments", ["-"]);
    return returned;
}

async function HasDepartment(dep){
    return (await GetDepartments()).includes(dep);
}

async function SetDepartments(deps){
    await GM.setValue("departments", deps);
}

async function AddDepartment(dep){
    let deps = await GetDepartments();
    deps.unshift(dep);
    await SetDepartments(deps);

    if (deps.length != 2){return;};

    GM.notification({
        text: "Lecturer ratings will be displayed from now on.",
        title: "Sufficient amount of departments selected",
        image : "https://i.imgur.com/QShZWua.png",
        timeout: 3000,
             //url: 'https://www.markmyprofessor.com/en/schools',

    });
}

async function RemoveDepartment(dep){
    let deps = await GetDepartments();
    await SetDepartments(deps.filter(el => el != dep));

    if (await NoDepartments()){
        GM.notification({
             text: "With no departments selected lecturer ratings will not be displayed.",
             title: "No departments selected",
             //url: 'https://www.markmyprofessor.com/en/schools',
             image : "https://i.imgur.com/QShZWua.png",
             timeout: 3000,
        });
    }
}

async function NoDepartments(){
    return (await GetDepartments()).length <= 1;
}

async function MoveDepartmentUp(dep){
    let deps = await GetDepartments();
    let ind = deps.indexOf(dep);

    let nextInd = (ind+1) % (deps.length - 1);
    let nextElem = deps[nextInd];

    deps[ind] = nextElem;
    deps[nextInd] = dep;

    await SetDepartments(deps);
}

function IsOnSchoolPage(){
    return unsafeWindow.location.href.match(new RegExp("^https:\/\/www\.markmyprofessor\.com((\/.*))?\/((iskola)|(school))([^(\/)]*)?$")) !== null;
}

function IsOnMarkMyProfessorPage(){
    return unsafeWindow.location.href.match(new RegExp("^https:\/\/www\.markmyprofessor\.com")) !== null;
}

function GoToDepartmentSelection(){
    GM.openInTab("https://www.markmyprofessor.com/en/schools", {active: true});
}

function GetSchoolTextNodeForCard(card){
    let returned = document.createElement("a");
    returned.href = card.firstChild.href;
    returned.innerText = "Click this card to select departments from this school to the Neptun extension";
    returned.classList.add("schoolText");
    return returned;
}

async function GetSwitchForDepartmentCard(card){
    let returned = document.createElement("label");
    returned.innerHTML = "<span>Add this department to Neptun extension</span>";

    let checkBox = document.createElement("input");
    checkBox.type = "checkbox";

    let departmentName = card.childNodes[1].firstChild.innerText;

    checkBox.checked = await HasDepartment(departmentName);

    checkBox.addEventListener("change", async function (event) {
        if (checkBox.checked){
            await AddDepartment(departmentName);
        } else {
            await RemoveDepartment(departmentName);
        }

        //console.log(await GetDepartments());
    })

    await GM.addValueChangeListener("departments", async function(key, oldValue, newValue, remote) {
        checkBox.checked = newValue.includes(departmentName);
    });

    returned.classList.add("departmentSwitch");
    returned.appendChild(checkBox);

    return returned;
}

async function GetSwitchForSchoolCard(){
    let returned = document.createElement("label");
    returned.innerHTML = "<span>Add this school to Neptun extension</span>";

    let checkBox = document.createElement("input");
    checkBox.type = "checkbox";

    let schoolName = document.title.split(" |")[0];

    checkBox.checked = await HasDepartment(schoolName);

    checkBox.addEventListener("change", async function (event) {
        if (checkBox.checked){
            await AddDepartment(schoolName);
        } else {
            await RemoveDepartment(schoolName);
        }

        //console.log(await GetDepartments());


    })

    returned.classList.add("schoolSwitch");
    returned.appendChild(checkBox);

    return returned;
}

function UpdateSchoolTexts(){
    if (!IsOnSchoolPage()){
        return
    }

    let cards = document.querySelectorAll("div.cards-grid > div.w-full.rounded.p-4.flex.flex-col.gap-4.bg-white")
    let cardHolder = cards[0].parentNode;

    if (cardHolder.hasAttribute(UPDATED_MARK_ATTR)){
        return;
    }

    for (let card of cards){
        //card.style = "background: red;"
        card.appendChild(GetSchoolTextNodeForCard(card));
    }

    cardHolder.setAttribute(UPDATED_MARK_ATTR, true);
}

async function UpdateDepartmentSwitches(){
    if (IsOnSchoolPage()){
        return;
    }

    let cards = Array.from(document.querySelectorAll("div.cards-grid > div.w-full.rounded.p-4.flex.flex-col.gap-4.bg-white"));

    if (cards.length === 0){
        // document.querySelector("div.cards-grid").appendChild(await GetSwitchForSchoolCard());
        return;
    }

    let cardHolder = cards[0].parentNode;

    if (cardHolder.hasAttribute(UPDATED_MARK_ATTR)){
        return;
    }

    for (let card of cards){
         //card.style = "background: red;"
         card.appendChild(await GetSwitchForDepartmentCard(card));
    }

    cardHolder.setAttribute(UPDATED_MARK_ATTR, true);
}

function GetDepartmentElement(dep){
    let returned = document.createElement("li");
    returned.classList.add("departmentElement");

    let depP = document.createElement("p");
    depP.innerText = dep;
    depP.classList.add("departmentText");

    let depRemove = document.createElement("button");
    depRemove.addEventListener("click", async function(event) {
          await RemoveDepartment(dep);
    });

    depRemove.classList.add("departmentRemoveButton");
    depRemove.innerHTML = '<svg fill="#000000" version="1.1" id="Layer_1" xmlns:x="&amp;ns_extend;" xmlns:i="&amp;ns_ai;" xmlns:graph="&amp;ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" enable-background="new 0 0 24 24" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <metadata> <sfw xmlns="&amp;ns_sfw;"> <slices> </slices> <slicesourcebounds width="505" height="984" bottomleftorigin="true" x="0" y="-984"> </slicesourcebounds> </sfw> </metadata> <g> <g> <g> <path d="M9,3H7c0-1.7,1.3-3,3-3v2C9.4,2,9,2.4,9,3z"></path> </g> </g> <g> <g> <path d="M17,3h-2c0-0.6-0.4-1-1-1V0C15.7,0,17,1.3,17,3z"></path> </g> </g> <g> <g> <polygon points="17,6 7,6 7,3 9,3 9,4 15,4 15,3 17,3 "></polygon> </g> </g> <g> <g> <rect x="10" width="4" height="2"></rect> </g> </g> <g> <g> <path d="M21,6H3C2.4,6,2,5.6,2,5s0.4-1,1-1h18c0.6,0,1,0.4,1,1S21.6,6,21,6z"></path> </g> </g> <g> <g> <path d="M19,24H5c-0.6,0-1-0.4-1-1V9c0-0.6,0.4-1,1-1h14c0.6,0,1,0.4,1,1v14C20,23.6,19.6,24,19,24z M6,22h12V10H6V22z"></path> </g> </g> <g> <g> <path d="M10,20c-0.6,0-1-0.4-1-1v-6c0-0.6,0.4-1,1-1s1,0.4,1,1v6C11,19.6,10.6,20,10,20z"></path> </g> </g> <g> <g> <path d="M14,20c-0.6,0-1-0.4-1-1v-6c0-0.6,0.4-1,1-1s1,0.4,1,1v6C15,19.6,14.6,20,14,20z"></path> </g> </g> </g> </g></svg>';


    let depMoveUp = document.createElement("button");
    depMoveUp.addEventListener("click", async function(event) {
          await MoveDepartmentUp(dep);
    });

    depMoveUp.classList.add("departmentMoveUpButton");
    depMoveUp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3C12.5523 3 13 3.44772 13 4V17.5858L18.2929 12.2929C18.6834 11.9024 19.3166 11.9024 19.7071 12.2929C20.0976 12.6834 20.0976 13.3166 19.7071 13.7071L12.7071 20.7071C12.3166 21.0976 11.6834 21.0976 11.2929 20.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L11 17.5858V4C11 3.44772 11.4477 3 12 3Z" fill="#000000"></path> </g></svg>';

    returned.appendChild(depP);
    returned.appendChild(depRemove);
    returned.appendChild(depMoveUp);

    return returned;

}

async function GetListOfDepartmentElements(){
    let listHolder = document.createElement("ol");
    listHolder.classList.add("departmentListBodyListHolder");

    let deps = await GetDepartments();

    for (let dep of deps){
        if (dep === "-"){
            continue;
        }
        listHolder.appendChild(GetDepartmentElement(dep));
    }
    return listHolder;
}

async function GetDepartmentsList(){
    let returned = document.createElement("div");
    returned.classList.add("departmentListHolder");
    returned.classList.add("closed");

    let returnedHeader = document.createElement("div");
    returnedHeader.classList.add("departmentListHeader");

    let returnedHeaderPic = document.createElement("div");
    returnedHeaderPic.classList.add("departmentListHeaderPic");

    let returnedHeaderText = document.createElement("p");
    returnedHeaderText.innerText = "Selected departments";
    returnedHeaderText.classList.add("departmentListHeaderText");

    let returnedHeaderButton = document.createElement("button");
    returnedHeaderButton.classList.add("departmentListHeaderButton");

    returnedHeaderButton.addEventListener("click", function(event) {
          returned.classList.toggle("closed");
          //console.log("pressed");
    });

    let returnedBody = document.createElement("div");
    returnedBody.classList.add("departmentListBody");

    let returnedBodyText = document.createElement("p");
    returnedBodyText.innerText = "Order departments based on relevance. The extension will look up ratings based on this list, prefering departments near the top.";
    returnedBodyText.classList.add("departmentListBodyText");

    let listHolder = await GetListOfDepartmentElements();

    await GM.addValueChangeListener("departments", async function(key, oldValue, newValue, remote) {
        listHolder.remove();
        listHolder = await GetListOfDepartmentElements();
        returnedBody.appendChild(listHolder);
    });

    returnedHeader.appendChild(returnedHeaderPic);
    returnedHeader.appendChild(returnedHeaderText);
    returnedHeader.appendChild(returnedHeaderButton);

    returnedBody.appendChild(returnedBodyText);
    returnedBody.appendChild(listHolder);

    returned.appendChild(returnedHeader);
    returned.appendChild(returnedBody);

    return returned;
}

async function AddDepartmentsList(){
    if (!IsOnMarkMyProfessorPage()){
        return;
    }
    let list = await GetDepartmentsList();

    for (let l of document.querySelectorAll(".departmentListHolder")){
        //console.log(l);
        l.remove();
    }

    document.querySelector("body").appendChild(list);
}

async function HandleDepartmentSelection(){
    if (!IsOnMarkMyProfessorPage()){
        return;
    }
    UpdateSchoolTexts();
    await UpdateDepartmentSwitches();
    await AddDepartmentsList();

    // await GM.addValueChangeListener("departments", async function(key, oldValue, newValue, remote) {
    //     await AddDepartmentsList();
    // });
}

//==Start==

function SetUpStyles(){
    GM.addStyle(
    `
      .ratedNameRow {
         display: flex;
         justify-content: space-between;
         max-width: 17rem;
         min-width: 9rem;
      }

      .schoolText {
         text-align: center;
      }

      .departmentSwitch , .schoolSwitch{
         display: flex;
         align-items: center;
         gap: 1rem;
      }

      .departmentSwitch > input, .schoolSwitch > input{
          width: 1.5rem;
          height: 1.5rem;
      }

      .departmentListHolder{
         position: fixed;
         left: 0;
         bottom: 0;
         background: rgb(26, 26, 26);

         border-top-right-radius: 0.5rem;
         outline: 0.1rem solid black;
         color: white;
         max-width: 43rem;

         z-index: 9999;
      }

      .departmentListHeader{
          display: flex;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;

          background: white;
          color: black;
          padding-left: 1rem;
          padding-right: 1rem;
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
      }

      .departmentListHeaderPic{
          width: 3rem;
          height: 3rem;
          background: url(https://i.imgur.com/QShZWua.png);
          background-size: contain;
      }

      .departmentListHeaderText{
          font-size: 2rem;
          font-style: bold;
      }

      .departmentListHeaderButton{
         width: 2.5rem;
         height: 2.5rem;
      }

      .departmentListHeaderButton:hover,
      .departmentRemoveButton:hover,
      .departmentMoveUpButton:hover{
           scale: 1.1;
      }

      .departmentListHeaderButton::before{
          content: '\\25bc';
      }

      .closed .departmentListHeaderButton::before{
          content: '\\25b2';
      }

      .departmentListBody{
          padding-left: 2rem;
          padding-right: 2rem;

          max-height: 14.9rem;
          overflow-y: auto;

          transition: max-height 1s ease-in;
      }

      .closed .departmentListBody{
          max-height: 0;
      }

      .departmentListBodyText{
         padding-top: 0.2rem;
         padding-bottom: 0.2rem;
      }

      .departmentListBodyListHolder{
          display: flex;
          gap: 1rem;
          flex-direction: column;
          padding: 1rem;
          background: white;
          color: black;
          border-radius: 0.1rem;
      }

      .departmentElement{
         display: flex;
         gap: 1rem;
         counter-increment: section;
         align-items: center;
      }

      .departmentElement::before{
          content: counter(section) '. ';
      }

      .departmentText{
      }

      .departmentRemoveButton, .departmentMoveUpButton{
          min-width: 2rem;
          height: 2rem;
          padding: 0.3rem;
      }

      .departmentRemoveButton{
          background: red;
          margin-left: auto;
      }

      .departmentMoveUpButton{
          background: rgb(0, 127, 255);
      }


    `
    );
}
async function SetUpMenus(){

    let firstTime = await GM.getValue("firstTime", true);
    if (firstTime){
        await GM.setValue("firstTime", false);
        GM.notification({
             text: "In order for this extension to work please select the relevant departments from your school(s) by clicking here first",
             title: "Select Departments",
             url: 'https://www.markmyprofessor.com/en/schools',
        });
    }

    const departmentSelectorId = GM.registerMenuCommand("Select departments", function(event) {
        GoToDepartmentSelection();
    }, {
        autoClose: true
    });

    // const alwaysShowNotification = GM.registerMenuCommand("Debug show notification", function(event) {
    //     GM.setValue("firstTime", true);
    //     console.log("pls work")
    // }, {
    //     autoClose: true
    // });
}

async function OnStart(){

    // console.log("Start ran");
    GM.setValue("started", !IsOnMarkMyProfessorPage());
    if (window.onurlchange === null && IsOnMarkMyProfessorPage()){
        window.addEventListener('urlchange', async function(info) {
            location.reload();
        } );
    };
    setInterval(UpdateNames, 1000);
    //setInterval(HandleDepartmentSelection, 1000);
    SetUpStyles();

    await SetUpMenus();
    await HandleDepartmentSelection();

}

await OnStart();


