var Scrollkeep = (function () {

    var $x = {orig: 0, last: 0, vect: 0},
        $y = {orig: 0, last: 0, vect: 0},
        $dist_keep = { },
        $func_keep = { },
        $log = true;



    function init(config) {
        if ($log) {
            console.log("Initializing new scroll keep with:");
            console.log(config);
        }

        if ((getValidVectors().indexOf(config.vector) > -1) &&
            (typeof config.func == 'function') &&
            (parseInt(config.dist) > 0)) {
            $x.orig = window.scrollX;
            $y.orig = window.scrollY;
            addVectorToKeeps(config);

            window.addEventListener('scroll', checkScrollPosition);
            checkScrollPosition();
        }

        else {
            console.log("Cannot initialize scroll keep: bad config object.");
        }
    }



    function getDefaultConfig() {
        if ($log) {
            console.log("Getting default config object.");
        }

        return {
            vector: null,
            dist: 0,
            func: null
        };
    }



    function getValidVectors() {
        if ($log) {
            console.log("Getting valid vectors.");
        }

        return [
            'up', 'down', 'left', 'right', 'top', 'bottom'
        ];
    }



    function checkScrollPosition() {

        var x_curr = window.scrollX,
            y_curr = window.scrollY,
            x_diff = (x_curr - $x.last),
            y_diff = (y_curr - $y.last),
            x_dir = null,
            y_dir = null,
            funcs = [ ];

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

        if ((x_dir) && ($dist_keep[x_dir])) {
            funcs = funcs.concat(getFunctionsForDistance(x_dir, Math.abs($x.vect)));
        }

        if ((y_dir) && ($dist_keep[y_dir])) {
            funcs = funcs.concat(getFunctionsForDistance(y_dir, Math.abs($y.vect)));
        }

        // Run the funcs.
        for (var o = 0, m = funcs.length; o < m; o++) {
            funcs[o]();
        }

        // console.log('last: ('+$x.last+', '+$y.last+')');
        console.log('current: (' + window.scrollX + ', ' + window.scrollY + ')');
        // console.log('difference: ('+x_diff+', '+y_diff+')');
        // console.log('vector: ('+$x.vect+', '+$y.vect+')');

        $x.last = x_curr,
        $y.last = y_curr;

        // console.log($x);
        // console.log($y);
    }



    function getFunctionsForDistance(vect, dist) {
        var dists = $dist_keep[vect],
            func_key = null,
            funcs = [ ];

        out:
        for (var o = 0, m = dists.length; o < m; o++) {
            if ((dists[o] < dist) && (dist % dists[o] == 0)) {
                func_key = vect + dists[o];
                funcs = funcs.concat($func_keep[func_key]);
            }
            else {
                break out;
            }
        }

        return funcs;
    }



    function is_int(n){ 
        if ((parseFloat(n) == parseInt(n)) && !isNaN(n)) {
            return true;
        } else { 
            return false;
        } 
    }



    function mergeObjects(obj1, obj2) {
        if ($log) {
            console.log("Merging objects:");
            console.log(obj1);
            console.log("and:");
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

        if ($log) {
            console.log("Merged:");
            console.log(obj1);
        }

        return obj1;
    }



    function addVectorToKeeps(config) {
        if ($log) {
            console.log("Adding vector to keeps.");
        }

        if (!$dist_keep.hasOwnProperty(config.vector)) {
            $dist_keep[config.vector] = [ ];
        }

        $dist_keep[config.vector].push(config.dist);
        $dist_keep[config.vector].sort(function (a,b) {return a - b;});

        var func_key = config.vector + config.dist;

        if (!$func_keep.hasOwnProperty(func_key)) {
            $func_keep[func_key] = [ ];
        }

        $func_keep[func_key].push({
            func: config.func,
            last_called: 0
        });

        if ($log) {
            console.log("Distance keep:");
            console.log($dist_keep);
            console.log("Callback keep:");
            console.log($func_keep);
        }
    }





    /*
     * Public methods.
     */

    return {
        new: function(config) {
            return init(
                mergeObjects(getDefaultConfig(), config)
            );
        },

    };

})();

// var scroll_params = {
//     vector: [up|down|right|left|top|bottom],
//     distance: {the number of pixels the user must scroll before firing},
//     callback: {function}
// };

// // Init can take an object or array.
// var scroll_watcher = new Scroller();
