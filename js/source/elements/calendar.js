/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */

// #ifdef __AMLCALENDAR || __INC_ALL
/**
 * Element displaying a calendar, ordered by week. It allows the user to choose 
 * the month and year for which to display the days. Calendar returns a date 
 * in chosen date format. Minimal size of calendar is 150px.
 * 
 * Example:
 * Calendar component with date set on "Saint Nicholas Day" in iso date format
 * <code>
 *  <a:calendar
 *    top           = "200"
 *    left          = "400"
 *    output-format = "yyyy-mm-dd"
 *    value         = "2008-12-06" />
 * </code>
 * 
 * Example:
 * Sets the date based on data loaded into this component.
 * <code>
 *  <a:model id="mdlCalDD">
 *      <data date="2009-11-25" />
 *  </a:model>
 *  <a:calendar 
 *    output-format = "yyyy-mm-dd" 
 *    model         = "mdlCalDD" 
 *    value         = "[@date]" />
 * </code>
 * 
 * @constructor
 * @define calendar
 * @addnode elements
 *
 * @attribute {String}   output-format    the format of the returned value. See {@link term.dateformat more about the date format}.
 * @attribute {String}   default          the default date set when the calendar is opened.
 *     Possible values:
 *     today   calendar is set on today's date
 * @attribute {String}   value            the date returned by calendar; should be in the format specified by the output-format attribute.
 * 
 * @binding value  Determines the way the value for the element is retrieved 
 * from the bound data.
 *
 * @inherits apf.DataAction
 * 
 * @author      Lukasz Lipinski
 * @version     %I%, %G%
 * @since       1.0
 *
 */
apf.calendar = function(struct, tagName){
    this.$init(tagName || "calendar", apf.NODE_VISIBLE, struct);
    
    /**** Properties and Attributes ****/
    this.$calVars = {
        days         : ["Sunday", "Monday", "Tuesday", "Wednesday",
                        "Thursday", "Friday", "Saturday"],
        months       : [{name : "January",   number : 31},
                        {name : "February",  number : 28},
                        {name : "March",     number : 31},
                        {name : "April",     number : 30},
                        {name : "May",       number : 31},
                        {name : "June",      number : 30},
                        {name : "July",      number : 31},
                        {name : "August",    number : 31},
                        {name : "September", number : 30},
                        {name : "October",   number : 31},
                        {name : "November",  number : 30},
                        {name : "December",  number : 31}],

        day          : null,
        month        : null,
        year         : null,

        hours        : 1,
        minutes      : 0,
        seconds      : 0,

        currentMonth : null,
        currentYear  : null,
        numberOfDays : null,
        dayNumber    : null,

        temp         : null,

        inited       : false,
        startDiffs   : [],
        prevWidth    : 0,

        rRows        : [],
        rCells       : [[], [], [], [], [], []],
        rDoW         : []
    };
};

(function() {
    this.implement(
        //#ifdef __WITH_DATAACTION
        apf.DataAction
        //#endif
        //#ifdef __WITH_XFORMS
        //,apf.XForms
        //#endif
    );

    this.$supportedProperties.push("output-format", "default");

    /**
     * @attribute {String} output-format is a style of returned date
     * 
     * Possible values:
     *     d      day of the month as digits, no leading zero for single-digit days
     *     dd     day of the month as digits, leading zero for single-digit days
     *     ddd    day of the week as a three-letter abbreviation
     *     dddd   day of the week as its full name
     *     m      month as digits, no leading zero for single-digit months
     *     mm     month as digits, leading zero for single-digit months
     *     mmm    month as a three-letter abbreviation
     *     mmmm   month as its full name
     *     yy     year as last two digits, leading zero for years less than 2010
     *     yyyy   year represented by four digits
     *     h      hours, no leading zero for single-digit hours (12-hour clock)
     *     hh     hours, leading zero for single-digit hours (12-hour clock)
     *     H      hours, no leading zero for single-digit hours (24-hour clock)
     *     HH     hours, leading zero for single-digit hours (24-hour clock)
     *     M      minutes, no leading zero for single-digit minutes
     *     MM     minutes, leading zero for single-digit minutes
     *     s      seconds, no leading zero for single-digit seconds
     *     ss     seconds, leading zero for single-digit seconds
     */
    this.$propHandlers["output-format"] = function(value) {
        if (this.value) {
            var c = this.$calVars;
            this.setProperty("value", 
                new Date(
                    c.year, c.month, c.day, c.hours, c.minutes, c.seconds
                ).format(this.outputFormat = value)
            );
        }
        else
            this.outputFormat = value;
    };

    this.$propHandlers["value"] = function(value) {
        var c = this.$calVars;
        
        if (!this.outputFormat) {
            c.temp = value;
            return;
        }

        var date = Date.parse(value, this.outputFormat);

        //#ifdef __DEBUG
        if (!date || isNaN(date)) {
            return;
            /*throw new Error(apf.formErrorString(this, "Parsing date",
                "Invalid date: " + value));*/
        }
        //#endif

        c.day     = date.getDate();
        c.month   = date.getMonth();
        c.year    = date.getFullYear();
        c.hours   = date.getHours();
        c.minutes = date.getMinutes();
        c.seconds = date.getSeconds();

        this.value = value;
        this.redraw(c.month, c.year);
    };

    /**** Public methods ****/

    //#ifdef __WITH_CONVENIENCE_API

    /**
     * @method  Sets calendar date
     */
    this.setValue = function(value) {
        this.setProperty("value", value, false, true);
    };
    
    /**
     * @method  
     * 
     * @return {String} date indicated by calendar
     */
    this.getValue = function() {
        return this.value;
    };
    
    //#endif

    /**** Keyboard Support ****/

    //#ifdef __WITH_KEYBOARD
    this.addEventListener("keydown", function(e) {
        e = e || event;

        var key      = e.keyCode,
            ctrlKey  = e.ctrlKey,
            shiftKey = e.shiftKey,
            c        = this.$calVars;

        switch (key) {
            case 13: /* enter */
                this.selectDay(c.day);
                break;

            case 33: /* page up */
                this.nextMonth();
                break;

            case 34: /* page down */
                this.prevMonth();
                break;

            case 37: /* left arrow */
                if (ctrlKey)
                    this.prevMonth();
                else if (shiftKey)
                    this.prevYear();
                else {
                    if (c.day - 1 < 1) {
                        this.prevMonth();
                        this.selectDay(c.months[c.currentMonth].number);
                    }
                    else {
                        this.selectDay(c.day - 1);
                    }
                }
                break;

            case 38: /* up arrow */
                if (c.day - 7 < 1) {
                    this.prevMonth();
                    this.selectDay(c.months[c.currentMonth].number + c.day - 7);
                }
                else {
                    this.selectDay(c.day - 7);
                }
                break;

            case 39: /* right arrow */
                if (ctrlKey)
                    this.nextMonth();
                else if (shiftKey)
                    this.nextYear();
                else
                    this.selectDay(c.day + 1);
                break;

            case 40: /* down arrow */
                    this.selectDay(c.day + 7);
                break;

            case 84:
                if (ctrlKey)
                    this.today();
                    return false;
                break;
        }
    }, true);
    //#endif


    this.$blur = function() {
        this.$setStyleClass(this.$ext, "", [this.$baseCSSname + "Focus"]);
    };

    this.$focus = function() {
        this.$setStyleClass(this.oFocus || this.$ext, this.$baseCSSname + "Focus");
    }

    var isLeapYear = function(year) {
        return ((year % 4 == 0) && (year % 100 !== 0)) || (year % 400 == 0)
            ? true
            : false;
    };
    
    this.$getMargin = function(oHtml) {
        if (apf.isIE) {
            return [
                (parseInt(apf.getStyle(oHtml, "marginLeft")) || 0)
                + (parseInt(apf.getStyle(oHtml, "marginLeft")) || 0),
                (parseInt(apf.getStyle(oHtml, "marginTop")) || 0)
                + (parseInt(apf.getStyle(oHtml, "marginBottom")) || 0)
            ];
        }
        else {
            return [
                parseInt(apf.getStyle(oHtml, "margin-right") || 0)
                + parseInt(apf.getStyle(oHtml, "margin-left") || 0),
                parseInt(apf.getStyle(oHtml, "margin-top") || 0)
                + parseInt(apf.getStyle(oHtml, "margin-bottom") || 0)
            ];
        }
    };
    
    this.$getFontSize = function(oHtml) {
        return apf.isIE
            ? parseInt(apf.getStyle(oHtml, "fontSize"))
            : parseInt(apf.getStyle(oHtml, "font-size"));
    }
    
    this.$getPadding = function(oHtml) {
        return apf.isIE
            ? [parseInt(apf.getStyle(oHtml, "paddingLeft"))
               + parseInt(apf.getStyle(oHtml, "paddingRight")),
              parseInt(apf.getStyle(oHtml, "paddingTop"))
               + parseInt(apf.getStyle(oHtml, "paddingBottom"))]
            : [parseInt(apf.getStyle(oHtml, "padding-left"))
               + parseInt(apf.getStyle(oHtml, "padding-right")),
              parseInt(apf.getStyle(oHtml, "padding-top")) 
               + parseInt(apf.getStyle(oHtml, "padding-bottom"))];
    }

    this.$resize = function() {
        var width = parseInt(this.$ext.style.width || 0),
            c     = this.$calVars,
            i, j, l, l2;

        if (c.rRows.length == 0) {
            rows = this.oContent.childNodes;

            for (i = 0, l = rows.length; i < l; i++) {
                if ((rows[i].className || "").indexOf("row") > -1) {
                    c.rRows.push(rows[i]);

                    cells = rows[i].childNodes;
                    for (j = 0, l2 = cells.length; j < l2; j++) {
                        if ((cells[j].className || "").indexOf("cell") > -1)
                            c.rCells[c.rRows.length - 1].push(cells[j]);
                    }
                }
            }
        }

        if (c.rDoW.length == 0) {
            var daysofweek = this.oDow.childNodes;

            for (i = 0, l = daysofweek.length; i < l; i++) {
                if ((daysofweek[i].className || "").indexOf("dayofweek") > -1)
                    c.rDoW.push(daysofweek[i]);
            }
        }

        if (width > 0 && c.prevWidth !== width) {
            c.prevWidth = width;

            var ctDiff = apf.getDiff(this.$ext),
                _width = parseInt(this.$ext.offsetWidth
                    || this.$ext.style.width
                    || apf.getStyle(this.$ext, "width")) - ctDiff[0],

                rDiff = c.startDiffs[0], rDiff2 = c.startDiffs[1],
                cDiff = c.startDiffs[2], cDiff2 = c.startDiffs[3],
                eDiff = c.startDiffs[4],

                rWidth = _width - rDiff[0] - rDiff2[0],
                cWidthf = Math.floor(rWidth * 0.125) - cDiff[0] - cDiff2[0],
            
                height = cWidthf
                    + (cDiff[1] > cDiff[0] ? cDiff[0] - cDiff[1] : 0)
                    + (cDiff2[1] > cDiff2[0] ? cDiff2[0] - cDiff2[1] : 0),
                paddingBT,
                pl = Math.floor((rWidth - rDiff[0] - rDiff2[0]
                - (cWidthf + cDiff[0] + cDiff2[0]) * 8) * 0.5);

            for (i = 0, l = c.rRows.length; i < l; i++) {
                var row = c.rRows[i];

                for (j = 0, l2 = c.rCells[i].length; j < l2; j++) {
                    var cell = c.rCells[i][j];

                    paddingBT = Math.ceil((height - this.$getFontSize(cell))*0.5);
                    
                    cell.style.width         = (Math.max(cWidthf, 0) - (apf.isIE || apf.isChrome ? 1 : 0)) + "px";
                    cell.style.height        = (height - (2 * paddingBT - cDiff[1]))+ "px";
                    cell.style.paddingTop    = (paddingBT > 0 ? paddingBT + 1 : 0) + "px";
                    cell.style.paddingBottom = (paddingBT > 0 ? paddingBT - 1 : 0) + "px";
                    if (apf.isIE || apf.isChrome) {
                        cell.style.paddingLeft = (parseInt(cell.style.paddingLeft || 0) + 1) + "px";
                    }
                    
                }

                row.style.paddingLeft = pl + "px";

                this.$ext.style.paddingBottom = (Math.floor(eDiff[1] * 0.5) + pl) + "px";
            }

            this.oDow.style.paddingLeft = pl + "px";
    
            for (i = 0, l = c.rDoW.length; i < l; i++) {
                var dof = c.rDoW[i];
                dof.style.width  = cWidthf + "px";

                if (cWidthf < 16)
                    dof.style.fontSize = "9px";
            }
        }
    }

    this.redraw = function(month, year) {
        var w_firstYearDay = new Date(year, 0, 1),
            w_dayInWeek    = w_firstYearDay.getDay(),
            w_days         = w_dayInWeek,
            c              = this.$calVars;

        c.currentMonth = month;
        c.currentYear  = year;
        
        for (i = 0; i <= month; i++) {
            if (isLeapYear(year) && i == 1) {
                w_days++;
            }
            w_days += c.months[i].number;
        }

        var w_weeks  = Math.ceil(w_days / 7),
            date     = new Date(year, month);

        c.numberOfDays = c.months[date.getMonth()].number;
        if (isLeapYear(year) && date.getMonth() == 1) 
            c.numberOfDays++;

        c.dayNumber = new Date(year, month, 1).getDay();
        var prevMonth     = month == 0 ? 11 : month - 1,
            prevMonthDays = c.months[prevMonth].number - c.dayNumber + 1,

            nextMonthDays = 1,

            ctDiff        = apf.getDiff(this.$ext),
            _width        = parseInt(this.$ext.offsetWidth || this.$ext.style.width
                            || apf.getStyle(this.$ext, "width")) - ctDiff[0],
            /* Navigation buttons */
            navi          = this.oNavigation.childNodes;

        //@todo fix this!! 
        if (!_width) return;

        for (i = 0; i < navi.length; i++) {
            if ((navi[i].className || "").indexOf("today") != -1) {
                navi[i].innerHTML = "T";
            }
            else if ((navi[i].className || "").indexOf("status") != -1) {
                if (_width >= 300) {
                    navi[i].innerHTML = c.months[c.currentMonth].name
                        + " " + c.currentYear;
                    navi[i].style.width = "100px";
                    navi[i].style.marginLeft = "-50px";
                }
                else {
                    navi[i].innerHTML = (c.currentMonth + 1)
                        + "/" + c.currentYear;
                    navi[i].style.width = "40px";
                    navi[i].style.marginLeft = "-20px";
                }
            }
        }

        //Rows
        var rows = this.oContent.childNodes,
            cWidthf, pl;
        for (var i = 0, z = 0, y = 0; i < rows.length; i++) {
            if ((rows[i].className || "").indexOf("row") > -1) {
                var rDiff = !c.inited ? apf.getDiff(rows[i]) : c.startDiffs[0];
                var rDiff2 = !c.inited ? this.$getMargin(rows[i]) : c.startDiffs[1];
                var rWidth = _width - rDiff[0] - rDiff2[0];
                
                if (!c.inited) {
                    c.startDiffs[0] = rDiff
                    c.startDiffs[1] = rDiff2;
                }

                //Cells
                var cells = rows[i].childNodes;
                for (var j = 0, disabledRow = 0; j < cells.length; j++) {
                    if ((cells[j].className || "").indexOf("cell") > -1) {
                        var cDiff = !c.inited ? apf.getDiff(cells[j]) : c.startDiffs[2],
                            cDiff2 = !c.inited ? this.$getMargin(cells[j]) : c.startDiffs[3];

                        if (!c.inited) {
                            c.startDiffs[2] = cDiff
                            c.startDiffs[3] = cDiff2;
                            
                        }
                        cWidthf = Math.floor(rWidth / 8)
                            - cDiff[0] - cDiff2[0];
                        var width = cWidthf,
                            height = cWidthf
                            + (cDiff[1] > cDiff[0]
                                ? cDiff[0] - cDiff[1]
                                : 0) 
                            + (cDiff2[1] > cDiff2[0]
                                ? cDiff2[0] - cDiff2[1]
                                : 0),
                        paddingTop;

                        var paddingBottom = 
                            paddingTop = Math.ceil((height
                                - this.$getFontSize(cells[j])) / 2);

                        height -= (paddingTop + paddingBottom - cDiff[1]);
                        
                        cells[j].style.width         = (width > 0 ? width : 0) + "px";
                        cells[j].style.height        = (height > 0 ? height : 0) + "px";
                        cells[j].style.paddingTop    = (paddingTop > 0 ? paddingTop + 1 : 0) + "px";
                        cells[j].style.paddingBottom = (paddingBottom > 0 ? paddingBottom - 1 : 0) + "px";

                        // Drawing day numbers
                        this.$setStyleClass(cells[j], "", ["weekend",
                            "disabled", "active", "prev", "next", "weeknumber"]);
                        
                        z++;
                        if ((z - 1) % 8 == 0) {
                            cells[j].innerHTML = w_weeks 
                                - Math.ceil((c.months[c.month].number + c.dayNumber) / 7)
                                + 1 + (z - 1) / 8;
                            this.$setStyleClass(cells[j], "weeknumber");
                        }
                        else {
                            y++;

                            if (y <= c.dayNumber) {
                                cells[j].innerHTML = prevMonthDays++;
                                this.$setStyleClass(cells[j], "disabled prev");
                                
                            }
                            else if (y > c.dayNumber
                              && y <= c.numberOfDays + c.dayNumber) {
                                cells[j].innerHTML = y - c.dayNumber;
        
                                var dayNrWeek = new Date(year, month,
                                    y - c.dayNumber).getDay();
        
                                if (dayNrWeek == 0 || dayNrWeek == 6)
                                    this.$setStyleClass(cells[j], "weekend");
        
                                if (month == c.month && year == c.year
                                  && y - c.dayNumber == c.day)
                                    this.$setStyleClass(cells[j], "active");
                            }
                            else if (y > c.numberOfDays + c.dayNumber) {
                                cells[j].innerHTML = nextMonthDays++;
                                this.$setStyleClass(cells[j], "disabled next");
                                disabledRow++;
                            }
                        }
                    }
                }

                pl = Math.floor((rWidth - rDiff[0] - rDiff2[0] 
                    - (cWidthf + cDiff[0] + cDiff2[0])*8)/2);
                rows[i].style.paddingLeft = pl + "px";
                
                var eDiff = !c.inited ? this.$getPadding(this.$ext) : c.startDiffs[4];
                
                if (!c.inited)
                    c.startDiffs[4] = eDiff
                
                this.$ext.style.paddingBottom = 
                    (Math.floor(eDiff[1]/2) + pl) + "px";
                
                
                if (!this.height) {
                    rows[i].style.display = disabledRow == 7
                        ? "none"
                        : "block";
                }
                else {
                    rows[i].style.visibility = disabledRow == 7
                        ? "hidden"
                        : "visible";
                }
            }
        }
        
        /* Days of the week */
        var daysofweek = this.oDow.childNodes;
        this.oDow.style.paddingLeft = pl + "px";

        for (var z = 0, i = 0; i < daysofweek.length; i++) {
            if ((daysofweek[i].className || "").indexOf("dayofweek") > -1) {
                daysofweek[i].style.width  = (cWidthf > 0 ? cWidthf : 0) + "px";

                if (cWidthf < 16) {
                    daysofweek[i].style.fontSize = "9px";
                }

                if (z > 0) {
                    daysofweek[i].innerHTML = 
                        c.days[z - 1].substr(0, cWidthf < 12
                            ? 1 : (cWidthf < 16 ? 2
                            : 3));
                }
                else {
                    daysofweek[i].innerHTML = "&nbsp;";
                }
                z++;
            }
        }
        
        
        c.inited = true;
    };

    /**
     * Selects date and highlights its cell in calendar component
     *
     * @param {Number}   nr     day number
     * @param {String}   type   class name of html representation of selected cell
     */
    this.selectDay = function(nr, type) {
        var c        = this.$calVars,
            newMonth = type == "prev"
                ? c.currentMonth
                : (type == "next"
                    ? c.currentMonth + 2
                    : c.currentMonth + 1),

            newYear = c.currentYear;

        if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        else if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }

        this.change(new Date(newYear, (newMonth - 1), nr, c.hours, c.minutes,
            c.seconds).format(this.outputFormat));
    };

    /**
     * Change displayed year to next one
     */
    this.nextYear = function() {
        this.redraw(this.$calVars.currentMonth, this.$calVars.currentYear + 1);
    };

    /**
     * Change displayed year to previous one
     */
    this.prevYear = function() {
        this.redraw(this.$calVars.currentMonth, this.$calVars.currentYear - 1);
    };

    /**
     * Change displayed month to next one. If actual month is December, function
     * change current displayed year to next one
     */
    this.nextMonth = function() {
        var c = this.$calVars;
        this.redraw(
            c.currentMonth > 10 ? 0 : c.currentMonth + 1,
            c.currentMonth > 10 ? c.currentYear + 1 : c.currentYear
        );
    };

    /**
     * Change displayed month to previous one. If actual month is January, function
     * change current displayed year to previous one
     */
    this.prevMonth = function() {
        var c = this.$calVars;
        this.redraw(
            c.currentMonth < 1 ? 11 : c.currentMonth - 1,
            c.currentMonth < 1 ? c.currentYear - 1 : c.currentYear
        );
    };

    /**
     * Select today's date in calendar component
     */
    this.today = function() {
        this.setProperty("value", new Date().format(this.outputFormat));
    };

    /**** Init ****/

    this.$draw = function() {
        //Build Main Skin
        this.$ext = this.$getExternal("main", null, function(oExt) {
            var oContent = this.$getLayoutNode("main", "content", oExt);

            for (var i = 0; i < 6; i++) {
                this.$getNewContext("row");
                var oRow = oContent.appendChild(this.$getLayoutNode("row"));

                for (var j = 0; j < 8; j++) {
                    this.$getNewContext("cell");
                    var oCell = this.$getLayoutNode("cell");
                    if (j > 0) {
                        oCell.setAttribute("onmouseover",
                            "if (this.className.indexOf('disabled') > -1 "
                            + "|| this.className.indexOf('active') > -1) "
                            + "return; apf.lookup(" + this.$uniqueId 
                            + ").$setStyleClass(this, 'hover');");
                        oCell.setAttribute("onmouseout", 
                            "var o = apf.lookup(" + this.$uniqueId 
                            + ").$setStyleClass(this, '', ['hover']);");
                        oCell.setAttribute("onmousedown", 
                            "var o = apf.lookup(" + this.$uniqueId + ");"
                            + " if (this.className.indexOf('prev') > -1) { "
                            + "o.selectDay(this.innerHTML, 'prev');}"
                            + " else if (this.className.indexOf('next') > -1) {"
                            + "o.selectDay(this.innerHTML, 'next');}"
                            + " else {o.selectDay(this.innerHTML);}");
                    }
                    oRow.appendChild(oCell);
                }
            }

            var oNavigation = this.$getLayoutNode("main", "navigation", oExt);

            if (oNavigation) {
                var buttons = ["prevYear", "prevMonth", "nextYear", "nextMonth",
                               "today", "status"];
                for (var i = 0; i < buttons.length; i++) {
                    this.$getNewContext("button");
                    var btn = oNavigation.appendChild(this.$getLayoutNode("button"));
                    this.$setStyleClass(btn, buttons[i]);
                    if (buttons[i] !== "status")
                        btn.setAttribute("onmousedown", 'apf.lookup('
                                         + this.$uniqueId + ').'
                                         + buttons[i] + '()');
                }
            }

            var oDaysOfWeek = this.$getLayoutNode("main", "daysofweek", oExt);

            for (var i = 0; i < this.$calVars.days.length + 1; i++) {
                this.$getNewContext("day");
                oDaysOfWeek.appendChild(this.$getLayoutNode("day"));
            }
        });

        this.oNavigation = this.$getLayoutNode("main", "navigation",  this.$ext);
        this.oDow        = this.$getLayoutNode("main", "daysofweek",  this.$ext);
        this.oContent    = this.$getLayoutNode("main", "content",  this.$ext);
        
        
        //#ifdef __WITH_LAYOUT
        apf.layout.setRules(this.$ext, "resize", "var o = apf.all[" + this.$uniqueId + "];\
        if (o) o.$resize()", true);
        apf.layout.queue(this.$ext);
        //#endif
    };

    this.$loadAml = function(x) {
        if (typeof this.value == "undefined") {
            switch(this["default"]) {
                case "today":
                    this.setProperty("value", new Date().format(this.outputFormat));
                    break;
                default :
                    this.setProperty("value", new Date().format(this.outputFormat));
                    break;
            }
        }
        else {
            var c    = this.$calVars,
                date = Date.parse(c.temp || this.value, this.outputFormat);
            c.day   = date.getDate();
            c.month = date.getMonth();
            c.year  = date.getFullYear();

            if (c.day && c.month && c.year) {
                this.setProperty("value", new Date(c.year, c.month, c.day, c.hours,
                    c.minutes, c.seconds).format(this.outputFormat));
            }
            
        }
    };
    
    this.$destroy = function() {
        apf.popup.removeContent(this.$uniqueId);
        apf.destroyHtmlNode(this.$ext);
        this.oCalendar = null;
    };
}).call(apf.calendar.prototype = new apf.StandardBinding());

apf.aml.setElement("calendar", apf.calendar);
// #endif