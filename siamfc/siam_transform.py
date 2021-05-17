import numpy as np
from torchvision.transforms import Compose, CenterCrop, RandomCrop, ToTensor
from PIL import Image, ImageStat, ImageOps
from collections import namedtuple


class RandomStretch(object):

    def __init__(self, max_stretch=0.05, interpolation='bilinear'):
        assert interpolation in ['bilinear', 'bicubic']
        self.max_stretch = max_stretch
        self.interpolation = interpolation

    def __call__(self, img):
        scale = 1.0 + np.random.uniform(
            -self.max_stretch, self.max_stretch)
        size = np.round(np.array(img.size, float) * scale).astype(int)
        if self.interpolation == 'bilinear':
            method = Image.BILINEAR
        elif self.interpolation == 'bicubic':
            method = Image.BICUBIC
        return img.resize(tuple(size), method)


class SiamTransform:

    def __init__(self, **kargs):
        self.cfg = self.parse_args(**kargs)

        # augmentation for exemplar and instance images
        self.transform_z = Compose([
            RandomStretch(max_stretch=0.05),
            CenterCrop(self.cfg.instance_sz - 8),
            RandomCrop(self.cfg.instance_sz - 2 * 8),
            CenterCrop(self.cfg.exemplar_sz),
            ToTensor()])
        self.transform_x = Compose([
            RandomStretch(max_stretch=0.05),
            CenterCrop(self.cfg.instance_sz - 8),
            RandomCrop(self.cfg.instance_sz - 2 * 8),
            ToTensor()])

    def parse_args(self, **kargs):
        # default parameters
        cfg = {
            'pairs_per_seq': 10,
            'max_dist': 100,
            'exemplar_sz': 127,
            'instance_sz': 255,
            'context': 0.5}

        for key, val in kargs.items():
            if key in cfg:
                cfg.update({key: val})
        return namedtuple('GenericDict', cfg.keys())(**cfg)

    def transformPair(self, exemplar_image, instance_image, box):
                
        exemplar_image = self._crop_and_resize(exemplar_image, box)
        instance_image = self._crop_and_resize(instance_image, box)
        exemplar_image = 255.0 * self.transform_z(exemplar_image)
        instance_image = 255.0 * self.transform_x(instance_image)

        return exemplar_image, instance_image

    def __len__(self):
        return self.cfg.pairs_per_seq * len(self.seq_dataset)

    def _sample_pair(self, n):
        assert n > 0
        if n == 1:
            return 0, 0
        elif n == 2:
            return 0, 1
        else:
            max_dist = min(n - 1, self.cfg.max_dist)
            rand_dist = np.random.choice(max_dist) + 1
            rand_z = np.random.choice(n - rand_dist)
            rand_x = rand_z + rand_dist

        return rand_z, rand_x

    def _crop_and_resize(self, image, box):
        # convert box to 0-indexed and center based
        box = np.array([
            box[0] - 1 + (box[2] - 1) / 2,
            box[1] - 1 + (box[3] - 1) / 2,
            box[2], box[3]], dtype=np.float32)
        center, target_sz = box[:2], box[2:]

        # exemplar and search sizes
        context = self.cfg.context * np.sum(target_sz)
        z_sz = np.sqrt(np.prod(target_sz + context))
        x_sz = z_sz * self.cfg.instance_sz / self.cfg.exemplar_sz

        # convert box to corners (0-indexed)
        size = round(x_sz)
        corners = np.concatenate((
            np.round(center - (size - 1) / 2),
            np.round(center - (size - 1) / 2) + size))
        corners = np.round(corners).astype(int)

        # pad image if necessary
        pads = np.concatenate((
            -corners[:2], corners[2:] - image.size))
        npad = max(0, int(pads.max()))
        if npad > 0:
            avg_color = ImageStat.Stat(image).mean
            # PIL doesn't support float RGB image
            avg_color = tuple(int(round(c)) for c in avg_color)
            image = ImageOps.expand(image, border=npad, fill=avg_color)

        # crop image patch
        corners = tuple((corners + npad).astype(int))
        patch = image.crop(corners)

        # resize to instance_sz
        out_size = (self.cfg.instance_sz, self.cfg.instance_sz)
        patch = patch.resize(out_size, Image.BILINEAR)

        return patch