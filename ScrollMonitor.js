/*

  TODO:
  - If scroll too fast, might not register? Check pos:top
  - Cleanup functions
  - Documentation
  - Examples

 */



function ScrollMonitor(config) {

    var $self = { },
        $conf = { },
        $x = {orig: 0, last: 0, vect: 0},
        $y = {orig: 0, last: 0, vect: 0};



    function getDefaultConfig() {
        if ($conf.log) {
            console.log("Getting default config object.");
        }

        return {
            dir: null,
            dist: null,
            elem: window,
            func: null,
            log: false
        };
    }



    function getValidDirections() {
        if ($conf.log) {
            console.log("Getting valid directions.");
        }

        return ['up', 'down', 'left', 'right'];
    }



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

            if ($conf.log) {
                console.log("Initializing new scroll with:");
                console.log($conf);
                console.log("And $self:");
                console.log($self);
            }

            $conf.elem.addEventListener('scroll', $self.handler);
            $self.handler();
        }

        else {
            console.log("Cannot initialize new scroll monitor: bad config object.");
            console.log(config);
        }

        return $conf;
    }



    function validateConfig(conf) {
        var valid = { };

        if ((conf.hasOwnProperty('func')) &&
            (typeof conf.func == 'function')) {
            valid.func = conf.func;
        }
        else {
            console.log("ScrollMonitor error: no callback given.");
            return null;
        }

        if ((conf.hasOwnProperty('pos')) &&
            (getValidPositions().indexOf(conf.pos) != -1)) {
            valid.pos = conf.pos;
            valid.dist = ((conf.hasOwnProperty('dist')) &&
                          (is_int(conf.dist)))
                ? conf.dist
                : 0;
        }

        else if (((conf.hasOwnProperty('dir')) &&
                  (getValidDirections().indexOf(conf.dir) != -1)) ||
                 (conf.dir == null)) {
            valid.dir = conf.dir;

            if ((conf.hasOwnProperty('dist')) && (is_int(conf.dist))) {
                valid.dist = conf.dist;
            }
            else {
                console.log("ScrollMonitor error: no distance given.");
                return null;
            }
        }

        else {
            console.log("ScrollMonitor error: no direction/position given.");
            return null;
        }

        valid.elem = conf.elem;
        valid.log = conf.log;

        return valid;
    }



    function setSelfFromConf() {
        if ($conf.hasOwnProperty('pos')) {
            $self.handler = checkScrollPosition;
            // $self.check_dist = didScrollWithinPosition;
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
            x_diff = (curr.x - $x.last),
            y_diff = (curr.y - $y.last),
            x_dir = null,
            y_dir = null,
            dist = null,
            dir = null;

        // console.log('last: ('+$x.last+', '+$y.last+')');
        // console.log('current: (' + curr.x + ', ' + curr.y + ')');
        // console.log('difference: ('+x_diff+', '+y_diff+')');

        if (x_diff < 0) {
            x_dir = 'left';
            $x.vect = ($x.vect < 0) ? ($x.vect + x_diff) : x_diff;
        } else if (0 < x_diff) {
            x_dir = 'right';
            $x.vect = (0 < $x.vect) ? ($x.vect + x_diff) : x_diff;
        }

        if (y_diff < 0) {
            y_dir = 'up';
            $y.vect = ($y.vect < 0) ? ($y.vect + y_diff) : y_diff;
        } else if (0 < y_diff) {
            y_dir = 'down';
            $y.vect = (0 < $y.vect) ? ($y.vect + y_diff) : y_diff;
        }

        // console.log('vector: ('+$x.vect+', '+$y.vect+')');

        // Prefer the Y difference.
        if (Math.abs(y_diff) < Math.abs(x_diff)) {
            dist = curr.x;
            dir = x_dir;
            // console.log('INSIDE X direction: ' + dir + ' & distance: ' + dist);
        } else {
            dist = curr.y;
            dir = y_dir;
            // console.log('INSIDE Y direction: ' + dir + ' & distance: ' + dist);
        }

        // console.log('direction: ' + dir + ' & distance: ' + dist);

        var exec_pos = ($self.check_dist(Math.abs($self.last_f - dist), dir))
            ? dist
            : null;

        scrollCheckWrapup(curr, exec_pos);
    }



    function didScrollEnoughInDirection(dist, dir) {
        if (($conf.dir == dir) && ($conf.dist <= dist)) {
            return true;
        }
        else {
            return false;
        }
    }



    function didScrollEnough(dist, dir) {
        if ($conf.dist <= dist) {
            return true;
        }
        else {
            return false;
        }
    }



    function getCurrentPosition() {
        return {
            x: $conf.elem[$self.dist_x],
            y: $conf.elem[$self.dist_y]
        }
    }



    function scrollCheckWrapup(curr, exec_pos) {
        if (exec_pos) {
            $self.last_f = exec_pos;
            $conf.func();
        }

        $x.last = curr.x,
        $y.last = curr.y;
    }



    function mergeObjects(obj1, obj2) {
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
    function is_int(n) {
        if ((parseInt(n) == parseFloat(n)) &&
            (!isNaN(n))) {
            return true;
        } else {
            return false;
        }
    }



    function dropNulls(obj) {
        var ret = JSON.parse(JSON.stringify(obj));

        for (var key in ret) {
            if (ret[key] == null) {
                delete ret[key];
            }
        }

        return ret;
    }




    //////////////////////////////




    this.init = init;

    // This needs to stay down here.
    return this.init(config);
}
