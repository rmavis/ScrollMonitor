/*

  TODO:
  - [ ] Documentation
  - [ ] Examples
  - [X] If scroll too fast, might not register? Check pos:top
  - [X] Cleanup functions
    var.stop(); var = null;
  - [X] Logging

  NICE:
  - [X] dir: 'x|y'

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
     * `$x` and `$y` can expose useful information but they are also
     * used internally, so to the user they are read-only.
     *
     * `$conf` is given by the user. It makes some sense that they
     * should be able to change it, so it's merged with some other
     * user-safe properties and returned to them.
     *
     * The `$conf.dir` property is checked and slightly modified
     * during validation. See `validateConfig` for more.
     */
    var $self = { },
        $conf = { },
        $x = {orig: 0, last: 0, vect: 0},
        $y = {orig: 0, last: 0, vect: 0};



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
     * The `x` and `y` values map to `['left', 'right']` and
     * `['up', 'down']`, respectively. For more on those, see
     * `validateConfig`.
     */
    function getValidDirections() {
        if ($conf.log) {
            console.log("Getting valid directions.");
        }

        return ['up', 'down', 'left', 'right', 'x', 'y'];
    }


    // Why no `left` and `right`?  #HERE
    function getValidPositions() {
        if ($conf.log) {
            console.log("Getting valid positions.");
        }

        return ['top', 'bottom'];
    }



    function init(config) {
        var valid = null;

        if ((config.constructor === Object) &&
            (valid = validateConfig(mergeObjects(getDefaultConfig(), config)))) {

            $conf = valid;

            setSelfFromConf();
            addListener();

            if ($conf.log) {
                console.log("Initializing new scroll with:");
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

        return mergeObjects($conf, getPublicProperties());
    }



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
            console.log("Error: no callback given.");
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
                  (getValidDirections().indexOf(conf.dir) != -1)) ||
                 (conf.dir == null)) {
            if (conf.dir == 'y') {valid.dir = ['up', 'down'];}
            else if (conf.dir == 'x') {valid.dir = ['left', 'right'];}
            else {valid.dir = conf.dir;}

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



    function setSelfFromConf() {
        if ($conf.log) {
            console.log('Setting $self state from $conf state.');
        }

        if ($conf.hasOwnProperty('pos')) {
            $self.handler = checkScrollPosition;
        }
        else {
            $self.handler = checkScrollDistance;
            $self.check_dist = ($conf.dir)
                ? didScrollEnoughInDirection
                : didScrollEnough;
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



    function checkScrollPosition(evt) {
        if ($conf.log) {
            console.log("Checking scroll position.");
        }

        var curr = getCurrentPosition(),
            diff = getDeltas(curr),
            exec_pos = null;

        if ($conf.pos == 'top') {
            if (curr.y <= $conf.dist) {
                exec_pos = curr.y;
            }
        }

        else {
            var win_h = 'innerHeight' in window 
                ? window.innerHeight
                : document.documentElement.offsetHeight; 

            if ((win_h + $conf.dist) <= curr.y) {
                exec_pos = curr.y;
            }
        }

        scrollCheckWrapup(curr, exec_pos);
    }



    function checkScrollDistance(evt) {
        if ($conf.log) {
            console.log("Checking scroll distance.");
        }

        var curr = getCurrentPosition(),
            diff = getDeltas(curr),
            dist = null,
            dir = null;

        // console.log('last: ('+$x.last+', '+$y.last+')');
        // console.log('current: (' + curr.x + ', ' + curr.y + ')');
        // console.log('difference: ('+diff.x.dist+', '+diff.y.dist+')');
        // console.log('vector: ('+$x.vect+', '+$y.vect+')');

        // Prefer the Y difference.
        if (Math.abs(diff.y.dist) < Math.abs(diff.x.dist)) {
            dist = curr.x;
            dir = diff.x.dir;
            // console.log('INSIDE X direction: ' + dir + ' & distance: ' + dist);
        } else {
            dist = curr.y;
            dir = diff.y.dir;
            // console.log('INSIDE Y direction: ' + dir + ' & distance: ' + dist);
        }

        // console.log('direction: ' + dir + ' & distance: ' + dist);

        var exec_pos = ($self.check_dist(Math.abs($self.last_f - dist), dir))
            ? dist
            : null;

        scrollCheckWrapup(curr, exec_pos);
    }



    function didScrollEnoughInDirection(dist, dir) {
        if ($conf.log) {
            console.log('Checking if scroll distance in the right direction was enough.');
        }

        // $conf.dir will be an array of a string.
        // If the user changes the state of `dir` to something else,
        // then screw them.
        if ((($conf.dir.constructor === Array) &&
             ($conf.dir.indexOf(dir) != -1) &&
             ($conf.dist <= dist)) ||
            ((typeof $conf.dir == 'string') &&
             ($conf.dir == dir))) {
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
            console.log('Getting deltas and setting $x and $y vectors.');
        }

        var x_dist = (curr.x - $x.last),
            y_dist = (curr.y - $y.last),
            x_dir = null,
            y_dir = null;

        if (x_dist < 0) {
            x_dir = 'left';
            $x.vect = ($x.vect < 0) ? ($x.vect + x_dist) : x_dist;
        } else if (0 < x_dist) {
            x_dir = 'right';
            $x.vect = (0 < $x.vect) ? ($x.vect + x_dist) : x_dist;
        }

        if (y_dist < 0) {
            y_dir = 'up';
            $y.vect = ($y.vect < 0) ? ($y.vect + y_dist) : y_dist;
        } else if (0 < y_dist) {
            y_dir = 'down';
            $y.vect = (0 < $y.vect) ? ($y.vect + y_dist) : y_dist;
        }

        return {
            x: {
                dist: x_dist,
                dir: x_dir
            },
            y: {
                dist: y_dist,
                dir: y_dir
            }
        }
    }



    function scrollCheckWrapup(curr, exec_pos) {
        if ($conf.log) {
            console.log('Wrapping up scroll check.');
        }

        if (isInt(exec_pos)) {
            $self.last_f = exec_pos;
            $conf.func();
        }

        $x.last = curr.x,
        $y.last = curr.y;
    }



    function mergeObjects(obj1, obj2) {
        if ($conf.log) {
            console.log('Merging this object:');
            console.log(obj1);
            console.log('with this one:');
            console.log(obj2);
        }

        for (var key in obj2) {
            if (obj2.hasOwnProperty(key)) {
                if ((obj1[key]) &&
                    (obj1[key].constructor == Object) &&
                    (obj2[key].constructor == Object)) {
                    obj1[key] = mergeObjects(obj1[key], obj2[key]);
                }
                else {
                    obj1[key] = obj2[key];
                }
            }
        }

        return obj1;
    }



    // Copied and modified this from:
    // http://www.inventpartners.com/javascript_is_int
    function isInt(n) {
        if ($conf.log) {
            console.log('Checking if '+n+' is an integer.');
        }

        if ((parseInt(n) == parseFloat(n)) && (!isNaN(n))) {
            return true;
        } else {
            return false;
        }
    }



    function getPublicProperties() {
        if ($conf.log) {
            console.log('Getting public properties.');
        }

        return {
            x: (function () {return $x;}),
            y: (function () {return $y;}),
            start: addListener,
            stop: removeListener
        };
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
