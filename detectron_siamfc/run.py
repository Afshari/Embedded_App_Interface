from tracker import Tracker

import argparse


def arg_parse():
    """
    Parse arguements to the track module

    """
    parser = argparse.ArgumentParser(
        description='YOLOv3 - SiamFC Object Tracking Module')
    parser.add_argument("--video", dest='video', help="Video to run tracking upon",
                        default="data/Woman", type=str)
    parser.add_argument("--title",  help="Video to run tracking upon",
                        default="", type=str)
    return parser.parse_args()


def main(args):
    tracker = Tracker(title=args.title)
    tracker.track(args.video)


if __name__ == "__main__":
    args = arg_parse()
    # Fire(main(args))
    main(args)
