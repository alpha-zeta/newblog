# min_area_auth~abhi
from collections import *
sets = [[1, 2], [3, 5], [6, 2], [7, 5], [11, 2],
        [1, 5], [6, 5], [11, 5], [7, 2], [3, 2]]
def min_area(sets):
    new_space = defaultdict(list)
    for x, y in sets:
        new_space[x].append(y)
    end = {}
    ans = float('inf')
    for x in sorted(new_space):
        new = new_space[x]
        new.sort()
        for j, y2 in enumerate(new):
            for i in range(j):
                y1 = new[i]
                if (y1, y2) in end:
                    res = min(ans, (x - end[y1, y2]) * (y2 - y1))
                end[y1, y2] = x

    if res < float('inf'):
        return res
    else:
        return 0


print(min_area(sets))
