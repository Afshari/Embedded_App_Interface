from __future__ import absolute_import

from got10k.experiments import *

from siamfc import TrackerSiamFC
import ipdb


if __name__ == '__main__':
    
    # setup tracker
    net_path = 'pretrained/siamfc/model.pth'
    tracker = TrackerSiamFC(net_path=net_path)

    # setup experiments
    e = ExperimentGOT10k('data/', subset='test')

    image_files = e.dataset[0][0]
    anno = e.dataset[0][1]
    box = anno[0, :]
    
    # tracker.track(img_files, anno[0, :], visualize=False)

    print(box)

    for f, image_file in enumerate(image_files):

        box = tracker.trackOne(image_file, box, f, visualize=False)
        print(box)
    
    
    # ipdb.set_trace()
    # e.run(tracker, visualize=True)
    # e.report([tracker.name])
