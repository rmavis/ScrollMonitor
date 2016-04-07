# SCROLL MONITOR

ScrollMonitor is a class for monitoring scroll distances and
positions. It's useful for cases in which you want to trigger
things when the user scrolls by a certain amount or within range
of an edge, like changing the nav menu when they scroll to the
top of the page or sliding something in from the left when they
scroll right.


## USAGE

Create an instance of ScrollMonitor by passing it a config object:
```
    var scroll_mon = new ScrollMonitor({
        pos: 'top',
        dist: 50,
        func_in: makeNavAppear,
        func_out: makeNavDisappear
    });
```

After being initialized, `scroll_mon` will monitor the window's
scroll position and call `makeNavAppear` when the user scrolls
within 50 pixels of the top of the window and `makeNavDisappear`
when they scroll more than 50 pixels away from it. The functions
will be called only when the transition occurs and registers (if
the user scrolls quickly, the `scroll` event may not fire on
every pixel), and the callback will be passed an object
containing position and vector data that looks like:
```
    {
        x: {
            // an integer describing the current X position
            pos: (int),
            // a signed integer describing contiguous movement
            // along the X axis
            vect: (int)
        },
        y: {  // same but for the Y axis
            pos: (int),
            vect: (int)
        }
    }
```

If that instance needs to change the buffer to 100 pixels:
```
    scroll_mon.dist(100);
```

If that instance needs to change to monitor 100-pixel buffers
on both the top and bottom of the screen:
```
    scroll_mon.pos('y');
```

To pause/stop monitoring (remove the `scroll` event listener):
```
  scroll_mon.stop();
```

And then kill the instance:
```
  scroll_mon = null;
```

Or to start monitoring again:
```
  scroll_mon.start();
```

For a full list of public properties, see documentation on the
`setPublicProperties` function.


## DEPENDENCIES

None.


## DETAILS

An instance of ScrollMonitor can track either scroll position or
scroll distance but not both. The configuration of a positional
instance must look like:
```
  {
      // The element to monitor. Optional. Defaults to `window`.
      elem: (DOM element),
      // The position to monitor. Required.
      pos: [top|bottom|right|left|x|y],
      // A buffer off of that position. Optional. Defaults to 0.
      dist: (int),
      // The function to call when the scroll position moves into
      // the buffer range or against the edge. Required.
      func_in: (function),
      // The function to call when the scroll position moves out
      // of the buffer range or off of the edge. Required.
      func_out: (function),
      // Whether you want to see log messages. Optional. Defaults
      // to false.
      log: (bool)
  }
```

The configuration of a distance instance looks nearly identical,
with these changes:
```
      // The direction of distance to monitor. Required.
      // This is instead of `pos`.
      dir: [up|down|left|right|x|y],
      // The distance the user must scroll in the given `dir`
      // in order to trigger the callback. Required.
      dist: (int),
      // The function to fire when the user scrolls the given
      // `dist` in the given `dir`. Required. Use this instead
      // of `func_in` and `func_out`.
      func: (function),
```

During initialization, the functions that check distances and
position are set as state variables. This is in to minimize the
number of checks that must be made each time the scroll event is
fired, which can come frequently.

Because those checks are set during initialization, a change in
any of the related configuration options must be reflected in the
internal state -- for example, if the user changes the instance's
monitored direction from `up` to `y`. For the sake of consistency,
the getting and setting of configuration options is done through
a function. These functions will have the same names as the keys
used to set them on instantiation -- e.g., `dist()` will return
the instance's distance, and `dist(9000)` will set its distance
to `9000`.

Any of the configuration options can be changed at any time.

One thing to be aware of is setting the "far edge" distance, e.g.
```
  pos: 'bottom', dist: 50
```

When scrolling, the current position is always measured from the
top- and left-most corner of the window. So the number actually
set as the measurement of the "far edge" is:
```
    (height/width of document)
  - (height/width of viewport)
  - (height/width of `dist`)
```

So for a document 1000 pixels high, in a viewport 100 pixels high,
with a `dist` of 50, the "far edge" is 850.

Also note that, if you want to kill an instance, you must first
`stop()` it to remove the event listener.
