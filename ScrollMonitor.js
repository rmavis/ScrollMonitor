/*

  TODO:
  - [X] Support for `left` and `right` positions
  - [X] Position functions fire too many times?
  - [ ] Documentation
  - [ ] Examples
  - [ ] Better names for, e.g., `didScrollToNearEdge`
        Like `isPosByNearEdge` of `isPosWithinNearRange`?

*/



function ScrollMonitor(config) {

    /*
     * These variables prefixed with `$` are state variables. They
     * retain the instance's scroll position, config, etc.
     *
     * `$self` will contain, e.g., instructions on handling the
     * scroll event. It will not be made public because those things
     * should not be exposed to the user and they provide no useful
     * information.
     *
     * `$conf` is given by the user. It makes some sense that they
     * should be able to change it, but the values are also used
     * internally, so they should be checked a little. See how they
     * are returned in `setPublicProperties`.
     *
     * The `$pos` coordinates can expose useful information but they
     * are also used internally, so to the user they are read-only.
     */
    var $self = { },
        $conf = { },
        $pos = {
            x: {orig: 0, last: 0, vect: 0},
            y: {orig: 0, last: 0, vect: 0}
        };



    /*
     * The default config lacks a `pos` key, even though that is a
     * valid key. See `validateConfig` for more on that.
     *
     * If `dir` is `null` is the user's config, then the `func` will
     * fire when the user scrolls the `dist` in any direction.
     */
    function getDefaultConfig() {
        if ($conf.log) {
            console.log("Getting default config object.");
        }

        return {
            // This is the direction. Valid values are given in
            // `getValidDirections`.
            dir: null,
            // This is the distance. It should be an integer.
            dist: null,
            // This is the element. Any scrollable element will work.
            elem: window,
            // This is the callback function.
            func: null,
            // This will trigger many messages in the console.log.
            log: false
        };
    }



    /*
     * `x` maps to `left` and `right`, `y` maps to `up` and `down`.
     * For more on those, see `validateConfig`.
     */
    function getValidDirections() {
        if ($conf.log) {
            console.log("Getting valid directions.");
        }

        return ['up', 'down', 'left', 'right', 'x', 'y'];
    }



    /*
     * Similarly, `x` maps to `left` and `right`, `y` maps to `top`
     * and `bottom`.
     */
    function getValidPositions() {
        if ($conf.log) {
            console.log("Getting valid positions.");
        }

        return ['top', 'bottom', 'left', 'right', 'x', 'y'];
    }


    /*
     * This dispatches to parameter-validation and self-setting and
     * returns the resulting user-facing properties.
     */
    function init(config) {
        if (($conf.log) || (config.log)) {
            console.log("Starting initialization of new scroll object with:");
            console.log(config);
        }

        var valid = null;

        if ((config.constructor === Object) &&
            (valid = validateConfig(mergeObjects(getDefaultConfig(), config)))) {

            $conf = valid;

            setSelfFromConf();
            addListener();

            if ($conf.log) {
                console.log("Validated and merged $conf:");
                console.log($conf);
                console.log("And $self:");
                console.log($self);
            }

            $self.handler();
        }

        else {
            console.log("Cannot initialize new scroll monitor: bad config object.");
            console.log(config);
        }

        var public = setPublicProperties();

        if ($conf.log) {
            console.log("Returning initialized object:");
            console.log(public);
        }

        return public;
    }



    /*
     * In the interest of usability, the user-given directions need
     * to be valid direction words. In the interest of efficiency,
     * `x` and `y` are also valid direction words. If one of those
     * is given, `$self.bi_dir` will be set to true, else false.
     * This bidirectionality boolean allows for easy setting of the
     * vector in `getDeltas` and also easy checking of the direction
     * in `didScrollEnoughInDirection`.
     *
     * Also, if a `pos` is given instead of a `dir`, then the scroll
     * position will be checked instead of the distance. The `pos`
     * must be one of the edges of the element. And an optional `dist`
     * can be given as a buffer against that edge. So a config with
     *   { pos: 'top', dist: 100 }
     * will fire its function when the scroll position is within 100
     * pixels of the top of the element.
     */
    function validateConfig(conf) {
        if ($conf.log) {
            console.log('Validating config.');
        }

        var valid = { };

        if ((conf.hasOwnProperty('func')) &&
            (typeof conf.func == 'function')) {
            valid.func = conf.func;
        }
        else {
            console.log("Error: no callback function given.");
            return null;
        }

        if ((conf.hasOwnProperty('pos')) &&
            (getValidPositions().indexOf(conf.pos) != -1)) {
            valid.pos = conf.pos;
            valid.dist = ((conf.hasOwnProperty('dist')) &&
                          (isInt(conf.dist)))
                ? conf.dist
                : 0;
        }

        else if (((conf.hasOwnProperty('dir')) &&
                  (isDirectionValid(conf.dir))) ||
                 (!conf.hasOwnProperty('dir'))) {
            valid.dir = conf.dir;

            if ((conf.hasOwnProperty('dist')) && (isInt(conf.dist))) {
                valid.dist = conf.dist;
            }
            else {
                console.log("Error: no distance given.");
                return null;
            }
        }

        else {
            console.log("Error: no direction/position given.");
            return null;
        }

        valid.elem = conf.elem;
        valid.log = conf.log;

        return valid;
    }



    function isDirectionValid(dir) {
        if ($conf.log) {
            console.log('Checking if direction "'+dir+'" is valid.');
        }

        if (((getValidDirections().indexOf(dir) != -1)) ||
            (dir == null)) {
            return true;
        }
        else {
            return false;
        }
    }



    function setSelfFromConf() {
        if ($conf.log) {
            console.log('Setting $self state from $conf state.');
        }

        // The handlers are set on instantiation so they don't need
        // to be checked every time the event fires.
        if ($conf.hasOwnProperty('pos')) {
            $self.handler = checkScrollPosition;
            setSelfBiPosition($conf.pos);
        }
        else {
            $self.handler = checkScrollDistance;
            setSelfBiDirection($conf.dir);
        }

        if ($conf.elem == window) {
            $self.dist_x = 'scrollX';
            $self.dist_y = 'scrollY';
        }
        else {
            $self.dist_x = 'scrollLeft';
            $self.dist_y = 'scrollTop';
        }

        $self.last_f = 0;
    }



    function setSelfBiDirection(dir) {
        if ($conf.log) {
            console.log('Checking bidirectionality');
        }

        if (dir == null) {
            $self.bi_dir = true;
            $self.checkDist = didScrollEnough;
        }
        else if ((dir == 'x') || (dir == 'y')) {
            $self.bi_dir = true;
            $self.checkDist = didScrollEnoughInDirection;
        }
        else {
            $self.bi_dir = false;
            $self.checkDist = didScrollEnoughInDirection;
        }
    }



    function setSelfBiPosition(pos) {
        if ($conf.log) {
            console.log('Checking bipositionality');
        }

        $self.pos_check = ((pos == 'y') || (pos == 'top') || (pos == 'bottom'))
            ? 'y'
            : 'x';

        if ((pos == 'top') || (pos == 'left')) {
            $self.bi_pos = false;
            $self.checkEdge = didScrollToNearEdge;
            $self.pos_edge = 0;  // The $conf.dist is checked instead.
        }
        else if ((pos == 'bottom') || (pos == 'right')) {
            $self.bi_pos = false;
            $self.checkEdge = didScrollToFarEdge;
            $self.pos_edge = getFarEdge($self.pos_check);
        }
        else {
            $self.bi_pos = true;
            $self.checkEdge = didScrollToEdge;
            $self.pos_edge = getFarEdge($self.pos_check);
        }
    }



    function checkScrollPosition(evt) {
        if ($conf.log) {
            console.log("Checking scroll position.");
        }

        var curr = getCurrentPosition(),
            diff = getDeltas(curr),
            exec_pos = null;

        // If the last position is 0, the initial pass won't fire. #HERE
        if (($self.checkEdge(curr[$self.pos_check])) &&
            (!$self.checkEdge($pos[$self.pos_check].last))) {
            exec_pos = curr[$self.pos_check];
        }

        scrollCheckWrapup(curr, exec_pos);
    }



    function didScrollToEdge(pos) {
        if ((didScrollToNearEdge(pos)) || (didScrollToFarEdge(pos))) {
            return true;
        }
        else {
            return false;
        }
    }



    function didScrollToNearEdge(pos) {
        if (pos <= $conf.dist) {
            return true;
        }
        else {
            return false;
        }
    }



    function didScrollToFarEdge(pos) {
        if (($self.pos_edge - $conf.dist) <= pos) {
            return true;
        }
        else {
            return false;
        }
    }



    function checkScrollDistance(evt) {
        if ($conf.log) {
            console.log("Checking scroll distance.");
        }

        var curr = getCurrentPosition(),
            diff = getDeltas(curr),
            dist = null,
            dir = null;

        // Prefer the Y difference.
        if (Math.abs(diff.y.dist) < Math.abs(diff.x.dist)) {
            dist = curr.x;
            dir = diff.x.dir;
        }
        else {
            dist = curr.y;
            dir = diff.y.dir;
        }

        var exec_pos = ($self.checkDist(Math.abs($self.last_f - dist), dir))
            ? dist
            : null;

        scrollCheckWrapup(curr, exec_pos);
    }



    function didScrollEnoughInDirection(dist, dir) {
        if ($conf.log) {
            console.log('Checking if scroll distance ('+$conf.dist+' vs '+dist+') in the right direction ('+$conf.dir+' vs '+dir+') was enough.');
        }

        if (($conf.dir == dir) && ($conf.dist <= dist)) {
            return true;
        }
        else {
            return false;
        }
    }



    function didScrollEnough(dist, dir) {
        if ($conf.log) {
            console.log('Checking if scroll distance was enough.');
        }

        if ($conf.dist <= dist) {
            return true;
        }
        else {
            return false;
        }
    }



    function getCurrentPosition() {
        if ($conf.log) {
            console.log('Getting current position.');
        }

        return {
            x: $conf.elem[$self.dist_x],
            y: $conf.elem[$self.dist_y]
        }
    }



    function getDeltas(curr) {
        if ($conf.log) {
            console.log('Getting deltas and setting x and y vectors.');
        }

        var x_dist = (curr.x - $pos.x.last),
            y_dist = (curr.y - $pos.y.last),
            x_dir = null,
            y_dir = null;

        if (x_dist < 0) {
            x_dir = ($self.bi_dir) ? 'x' : 'left';
            $pos.x.vect = ($pos.x.vect < 0) ? ($pos.x.vect + x_dist) : x_dist;
        }
        else if (0 < x_dist) {
            x_dir = ($self.bi_dir) ? 'x' : 'right';
            $pos.x.vect = (0 < $pos.x.vect) ? ($pos.x.vect + x_dist) : x_dist;
        }

        if (y_dist < 0) {
            y_dir = ($self.bi_dir) ? 'y' : 'up';
            $pos.y.vect = ($pos.y.vect < 0) ? ($pos.y.vect + y_dist) : y_dist;
        }
        else if (0 < y_dist) {
            y_dir = ($self.bi_dir) ? 'y' : 'down';
            $pos.y.vect = (0 < $pos.y.vect) ? ($pos.y.vect + y_dist) : y_dist;
        }

        return {
            x: {dist: x_dist, dir: x_dir},
            y: {dist: y_dist, dir: y_dir}
        }
    }



    function scrollCheckWrapup(curr, exec_pos) {
        if ($conf.log) {
            console.log('Wrapping up scroll check.');
        }

        if (isInt(exec_pos)) {
            $self.last_f = exec_pos;
            $conf.func({
                x: {
                    pos: curr.x,
                    vect: $pos.x.vect
                },
                y: {
                    pos: curr.y,
                    vect: $pos.y.vect
                }
            });
        }

        $pos.x.last = curr.x,
        $pos.y.last = curr.y;
    }



    // The parameter to this needs to be `x` or `y`.
    // The `inner[Height|Width]` properties are not supported below
    // IE9. And `clientHeight` is for IE.
    function getFarEdge(v) {
        var prop = (v == 'x') ? 'Width' : 'Height',
            elem = ($conf.elem == window) ? document.body : $conf.elem;

        var elem_v = elem['offset'+prop] || elem['client'+prop];

        var view_v = ($conf.elem == window)
            ? window['inner'+prop]
            : $conf.elem['client'+prop];

        return (elem_v - view_v);
    }



    function mergeObjects(obj1, obj2) {
        if ($conf.log) {
            console.log('Merging this object:');
            console.log(obj1);
            console.log('with this one:');
            console.log(obj2);
        }

        var merged = { };

        for (var key in obj1) {
            if (obj1.hasOwnProperty(key)) {
                merged[key] = obj1[key];
            }
        }

        for (var key in obj2) {
            if (obj2.hasOwnProperty(key)) {
                if ((merged[key]) &&
                    (merged[key].constructor == Object) &&
                    (obj2[key].constructor == Object)) {
                    merged[key] = mergeObjects(merged[key], obj2[key]);
                }
                else {
                    merged[key] = obj2[key];
                }
            }
        }

        return merged;
    }



    // Copied and modified this from:
    // http://www.inventpartners.com/javascript_is_int
    function isInt(n) {
        if ($conf.log) {
            console.log('Checking if '+n+' is an integer.');
        }

        if ((parseInt(n) == parseFloat(n)) && (!isNaN(n))) {
            return true;
        }
        else {
            return false;
        }
    }



    function changeDirection(dir) {
        if (isDirectionValid(dir)) {
            setSelfBiDirection(dir);
            $conf.dir = dir;
        }
        else {
            console.log("Invalid direction '"+dir+"'. Skipping it.");
        }
    }



    function changePosition(pos) {
        if ((getValidPositions().indexOf(pos) != -1)) {
            setSelfBiPosition(pos);
            $conf.pos = pos;
        }
        else {
            console.log("Invalid position '"+pos+"'. Skipping it.");
        }
    }



    function changeOrView(prop, val) {
        if (typeof val == 'undefined') {
            return $conf[prop];
        }
        else {
            $conf[prop] = val;
            return true;
        }
    }



    // The user-facing direction-setter is a function. The
    // property is not set directly because of bidirectionality.
    // That needs to be checked and set on `$self`.
    function setPublicProperties() {
        if ($conf.log) {
            console.log('Setting public properties.');
        }

        var public = {
            dist: (function (n) {return changeOrView('dist', n);}),
            elem: (function (n) {return changeOrView('elem', n);}),
            func: (function (n) {return changeOrView('func', n);}),
            log: (function (n) {return changeOrView('log', n);}),
            x: (function () {return $pos.x;}),
            y: (function () {return $pos.y;}),
            start: addListener,
            stop: removeListener
        };

        if ('pos' in $conf) {
            public.setPos = changePosition;
        }
        else {
            public.setDir = changeDirection;
        }

        return public;
    }



    function addListener() {
        if ($conf.log) {
            console.log('Adding window scroll listener.');
        }

        $conf.elem.addEventListener('scroll', $self.handler);
    }



    function removeListener() {
        if ($conf.log) {
            console.log('Removing window scroll listener.');
        }

        $conf.elem.removeEventListener('scroll', $self.handler);
    }




    //////////////////////////////




    // This needs to stay down here.
    return init(config);
}
