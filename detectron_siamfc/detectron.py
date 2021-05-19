

import torch, torchvision
import glob

import detectron2
from detectron2.utils.logger import setup_logger

setup_logger()

# import some common libraries
import numpy as np
import os, json, cv2, random


# import some common detectron2 utilities
from detectron2 import model_zoo
from detectron2.engine import DefaultPredictor
from detectron2.config import get_cfg
from detectron2.utils.visualizer import Visualizer
from detectron2.data import MetadataCatalog, DatasetCatalog



class DetectronHandler:

    def __init__(self):

        self.cfg = get_cfg()
        self.cfg.MODEL.DEVICE = 'cpu'

        self.cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"))
        self.cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = 0.5  # set threshold for this model

        self.cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml")
        self.predictor = DefaultPredictor(self.cfg)


        self.class_to_name = {
            0: u'__background__',
            1: u'person',
            2: u'bicycle',
            3: u'car',
            4: u'motorcycle',
            5: u'airplane',
            6: u'bus',
            7: u'train',
            8: u'truck',
            9: u'boat',
            10: u'traffic light',
            11: u'fire hydrant',
            12: u'stop sign',
            13: u'parking meter',
            14: u'bench',
            15: u'bird',
            16: u'cat',
            17: u'dog',
            18: u'horse',
            19: u'sheep',
            20: u'cow',
            21: u'elephant',
            22: u'bear',
            23: u'zebra',
            24: u'giraffe',
            25: u'backpack',
            26: u'umbrella',
            27: u'handbag',
            28: u'tie',
            29: u'suitcase',
            30: u'frisbee',
            31: u'skis',
            32: u'snowboard',
            33: u'sports ball',
            34: u'kite',
            35: u'baseball bat',
            36: u'baseball glove',
            37: u'skateboard',
            38: u'surfboard',
            39: u'tennis racket',
            40: u'bottle',
            41: u'wine glass',
            42: u'cup',
            43: u'fork',
            44: u'knife',
            45: u'spoon',
            46: u'bowl',
            47: u'banana',
            48: u'apple',
            49: u'sandwich',
            50: u'orange',
            51: u'broccoli',
            52: u'carrot',
            53: u'hot dog',
            54: u'pizza',
            55: u'donut',
            56: u'cake',
            57: u'chair',
            58: u'couch',
            59: u'potted plant',
            60: u'bed',
            61: u'dining table',
            62: u'toilet',
            63: u'tv',
            64: u'laptop',
            65: u'mouse',
            66: u'remote',
            67: u'keyboard',
            68: u'cell phone',
            69: u'microwave',
            70: u'oven',
            71: u'toaster',
            72: u'sink',
            73: u'refrigerator',
            74: u'book',
            75: u'clock',
            76: u'vase',
            77: u'scissors',
            78: u'teddy bear',
            79: u'hair drier',
            80: u'toothbrush'
            }



    def detect(self, fullName):

        # fullName = "video_dir/Woman/159.jpg"

        # fileName = fullName.split('/')[-1]
        img = cv2.imread(fullName)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) 
        
        
        outputs = self.predictor(img)

        v = Visualizer(img[:, :, ::-1], MetadataCatalog.get(self.cfg.DATASETS.TRAIN[0]), scale=1.2)
        out = v.draw_instance_predictions(outputs["instances"].to("cpu"))
        img = out.get_image()[:, :, ::-1]

        #     print(outputs["instances"].get_fields()['pred_boxes'].tensor.numpy().reshape(1, -1))
        #     print(outputs["instances"].get_fields()['pred_classes'].numpy())

        # number_of_instances = len(outputs["instances"])
        # scores = outputs["instances"].get_fields()['scores'].numpy()

        boxes = outputs["instances"].get_fields()['pred_boxes'].tensor.numpy()
        classes = outputs["instances"].get_fields()['pred_classes'].numpy()


        currBoxes = boxes.copy()
        result = []

        for i in range(len(currBoxes)):
            currBoxes[i] = [ int( currBoxes[i][0] ), 
                            int( currBoxes[i][1] ), 
                            int( currBoxes[i][2] - currBoxes[i][0] ), 
                            int( currBoxes[i][3] - currBoxes[i][1] ) ]
            
            result.append( tuple( [ tuple(currBoxes[i]), self.class_to_name[classes[i]+1] ] ) )

        return result
