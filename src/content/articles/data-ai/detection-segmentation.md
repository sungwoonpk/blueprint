> **Object detection** finds each object in an image and draws a box with a class. **Segmentation** labels every pixel. Both are scored by overlap: **intersection over union** compares predicted and true regions. Detectors produce many overlapping guesses, removed by **non-maximum suppression**.

Classification says "this photo shows a textbook". Detection says where, and how many. Segmentation says which pixels.

## Three Tasks

| Task | Output | Example |
| --- | --- | --- |
| Classification | One label per image | Cover or spine |
| Detection | Boxes with labels and scores | Find each book on a shelf |
| Semantic segmentation | A class per pixel | Which pixels are book |
| Instance segmentation | A mask per object | Which pixels are this particular book |

## Intersection Over Union

IoU is the area of overlap divided by the area of union. It is 1 for a perfect match and 0 for none. With a true box from (10, 10) to (50, 50):

| Predicted Box | IoU |
| --- | --- |
| The same box | 1.00 |
| Shifted 5 pixels right and down | 0.62 |
| Shifted 10 pixels right and down | 0.39 |
| Shifted 20 pixels right | 0.33 |
| Larger box around it, (0, 0) to (60, 60) | 0.44 |
| Far away | 0.00 |

A shift of a quarter of the box's width already falls below the common 0.5 threshold. Small errors cost a lot of IoU, especially for small objects.

## Removing Duplicates

A detector fires many times around one object. **Non-maximum suppression** keeps the highest scoring box, discards others that overlap it beyond a threshold, and repeats. In our example of six boxes, three clustered on one object with scores 0.92, 0.85 and 0.80: the first two overlap with IoU 0.82. Suppression at 0.5 kept three boxes in total, one per distinct location. It fails when two real objects overlap heavily, since one may be suppressed.

## Average Precision

Sort detections by score. Each is a true positive if it matches an unmatched true box with IoU above the threshold, else a false positive. This traces a precision-recall curve, as in [Thresholds, ROC and Precision-Recall Curves](/data-ai/roc-pr), and **average precision** is the area under it.

Two true objects and three detections, a hit, a miss and a hit, give precision 1.0, 0.5 and 0.67 at recall 0.5, 0.5 and 1.0, for an average precision of 0.834 with the usual interpolation. **Mean average precision** averages over classes, and some benchmarks also average over several IoU thresholds.

## Detector Families

- **Two-stage**: first propose candidate regions, then classify and refine each. Faster R-CNN made the proposals with a network that shares features with the detector
- **One-stage**: predict boxes and classes directly from the feature maps in one pass. YOLO framed detection as regression and reported real-time speed
- **Set-based**: transformer detectors predict a fixed set of objects and avoid suppression

The older approach of running a classifier on sliding windows costs too much: a 640 by 480 image with a stride of 16 and nine box shapes already means 10,800 windows.

## Segmentation

Segmentation networks usually shrink the image to gather context and then grow it back to full size. **U-Net** adds skip connections from the shrinking path to the growing one, so fine detail survives, and its authors showed it can be trained from few annotated images with heavy augmentation.

For masks, IoU is joined by the **Dice** score, twice the overlap over the sum of the sizes. A 40×40 mask predicted 8 pixels off has an IoU of 0.47 and a Dice of 0.64. Pixel accuracy is useless for small objects: predicting "background everywhere" on a 100×100 image with a 5×5 object is 99.75 percent accurate.

## In Practice

- Labeling boxes and masks is expensive, so start from a pretrained detector
- Report results by object size, since small objects are hardest
- Choose the IoU and score thresholds from what an error costs
- Test on photos like those users will send, with clutter and bad light

## Key Points

- Detection outputs labeled boxes, and segmentation labels pixels
- IoU measures overlap: shifting a box diagonally by a quarter of its width gave 0.39
- Non-maximum suppression removes duplicate boxes, and average precision summarizes ranked detections
- Pixel accuracy hides failure on small objects: all-background scored 99.75 percent
- <u>Score with overlap-based metrics and look at results by object size</u>
