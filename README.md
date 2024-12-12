# Modus operandii
1. Create an AST tree (up to 3 nodes deep) by calling `Finder.regenerate()`. Each node can be one of the seven bitwise operations, a constant or one of the two variables A and B (which will be replaced by X and Y coordinates from the canvas)
2. For each pixel of a 256x256 canvas:
    1. Compute the value for the current coordinate by calling `Finder.solve()`:
        1. Save the state: starting from the tree root, recursively copy member array and value to a temporary property within every AST node 
        2. Propagate the A and B values: Starting from the tree root, recursively replace AST node's members if they're "%a" or "%b"
        3. Collapse: starting from the tree root, recursively compute the operations from every AST node through calling the `Bitwise` functions, bubbling up the computed values.
        4. Store the result of the tree root
        5. Restore the state: starting from the tree root, recursively set the temporary member array and temporary value to their original properties within every AST node 
        6. Return the stored result to the pixel rendering flow.
    2. Set the RGBA colors of the current pixel within the canvas buffer, with R being the computed value, A being 255, and G and B being 0.
    3. If it's a multiple of the 64th pixel, partially update the canvas, sleep for a couple milliseconds and check if there's an order to stop: if there's an order to stop, quit the function and the loop. 
3. Fully update the canvas with the results.
4. Get a PNG image for the current canvas.
5. Write an entry to the HTML Table containing the image, performance info and the formula.
6. Schedule another generation 500ms later.
