from __future__ import absolute_import

from got10k.experiments import *
from siamfc import TrackerSiamFC
import socket
from PIL import Image
from torchvision import transforms
import torch.nn.functional as F
from siam_transform import SiamTransform
import os
import shutil
from shutil import copyfile
import torch
import matplotlib
import time


postfixes = [ '', '_0', '_1', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9', '_10', '_11', '_12', '_13', '_14' ]

def saveCombinedImage():

    x_size = 239
    z_size = 127

    new_image = Image.new('RGB',(4*x_size, (x_size + z_size) * (len(postfixes)//4) ), (234, 234, 234))

    image_x = 0
    image_y = 0

    for i, postfix in enumerate(postfixes):

        if i != 0 and i % 4 == 0:
            image_x  = 0
            image_y += x_size[1]+z_size[1]
        
        x = Image.open(f'output/x{postfix}.jpg')
        z = Image.open(f'output/z{postfix}.jpg')

        x = x.resize((239, 239))
        z = z.resize((127, 127))
        
        x_size = x.size
        z_size = z.size
        

        new_image.paste(x,(image_x, image_y))
        new_image.paste(z,(image_x + (x_size[0]//4), image_y+x_size[1]))
        new_image.save("output/merged_image.jpg","JPEG")

        image_x += x_size[0]


def getModuleLists(tracker):
    module_lists = list(tracker.net.feature.modules())
    
    return module_lists[1:]

def getLayersOutput(img, module_lists):
    outputs = []
    names = []
    img = img.unsqueeze(0)

    for layer in module_lists:
        img = layer(img)
        outputs.append(img)
        names.append(str(layer))
        
    return outputs, names

def processData(outputs):
    processed = []
    for feature_map in outputs:
        feature_map = feature_map[0].squeeze(0)
        gray_scale = torch.sum(feature_map, 0)
        gray_scale = gray_scale / feature_map.shape[0]
        processed.append(gray_scale.data.cpu().numpy())
        
    return processed

def saveLayersOutput(processed, names, seq):

    for i in range(len(processed)):
        fileName = f"output/{seq}_{i}.jpg"
        matplotlib.image.imsave(fileName, processed[i])

def calcCrossCorrelation(x_last, z_last, adjust=False):
    n, c, h, w = x_last.size()
    x_last = x_last.view(1, n * c, h, w)

    out = F.conv2d(x_last, z_last, groups=n)
    out = out.view(n, 1, out.size(-2), out.size(-1))
    
    if adjust:
        out = 0.001 * out + 0.0
    
    fileName = f"output/cross.jpg"
    matplotlib.image.imsave(fileName , out.squeeze(0).squeeze(0).detach().numpy())



def handleRun(conn, addr):

    # setup tracker
    net_path = 'pretrained/siamfc/model.pth'
    tracker = TrackerSiamFC(net_path=net_path)
    module_lists = getModuleLists(tracker)

    e = ExperimentGOT10k('data/', subset='test')
    image_files = e.dataset[0][0]
    # print(f"Image Length: {len(image_files)}")
    anno = e.dataset[0][1]
    box = anno[0, :]
    
    siamTransform = SiamTransform()
    to_pil = transforms.ToPILImage()

    pathSave = ""
    file = None

    print('Connected by', addr)
    while True:

        data = conn.recv(1024)

        if not data:
            break

        data = str( data ).replace('b', '').replace("'", '')
        
        code = data.split(':')[0]
        
        if code == '101':

            idx  = int( data.split(':')[1] )
            dataset_idx  = int( data.split(':')[2] )
            run_type  = int( data.split(':')[3] )

            if dataset_idx != -1:

                image_files = e.dataset[dataset_idx][0]
                anno = e.dataset[dataset_idx][1]
                box = anno[0, :]
                print(f"Dataset Lengths: {len(image_files)}")

                if file != None:
                    file.close()

                if run_type == 1:   # Normal
                    currDataLength = len(image_files)

                elif run_type == 2: # Save
                    currDataLength = len(image_files)
                    dirSave = image_files[0].split('/')[-2]
                    pathSave = f"output/{dirSave}"
                    if os.path.exists(pathSave):
                        shutil.rmtree(pathSave)
                    os.mkdir(pathSave)
                    file = open(f"{pathSave}/boxes.txt", 'w')

                elif run_type == 3: # Load
                    dirSave = image_files[0].split('/')[-2]
                    pathSave = f"output/{dirSave}"
                    boxesArr = []
                    boxFile = open(f"{pathSave}/boxes.txt", 'r')
                    while True:
                        line = boxFile.readline()
                        if not line or line == '':
                            boxFile.close()
                            break
                        boxesArr.append(line)

                    currDataLength = len(boxesArr)


            if idx >= currDataLength:
                print("Current Dataset Finished")
                break


            if run_type == 1 or run_type == 2:

                image_file = image_files[idx]
                image = Image.open(image_file)
                image.save(f"output/original.jpg")                        

                box = tracker.trackOne(image_file, box, idx, visualize=False)
                boxToSend = ','.join(str( int(x) ) for x in box)

                exemplar_image, instance_image = siamTransform.transformPair(image, image, box)

                x_outputs, x_names = getLayersOutput(instance_image, module_lists)
                z_outputs, z_names = getLayersOutput(exemplar_image, module_lists)

                x_pro = processData(x_outputs)
                z_pro = processData(z_outputs)
                
                saveLayersOutput(x_pro, x_names, seq='x')
                saveLayersOutput(z_pro, z_names, seq='z')

                to_pil(instance_image).save("output/x.jpg")
                to_pil(exemplar_image).save('output/z.jpg')

                calcCrossCorrelation(x_outputs[-1], z_outputs[-1], adjust=True)

                saveCombinedImage()

                if run_type == 2: # Save Data
                    copyfile("output/cross.jpg", f"{pathSave}/{idx}_cross.jpg")
                    copyfile("output/merged_image.jpg", f"{pathSave}/{idx}_merged_image.jpg")
                    copyfile("output/original.jpg", f"{pathSave}/{idx}_original.jpg")
                    file.write(f"{boxToSend}\r\n")
                    file.flush()

            elif run_type == 3: # Load Data
                copyfile(f"{pathSave}/{idx}_cross.jpg", "output/cross.jpg")
                copyfile(f"{pathSave}/{idx}_merged_image.jpg", "output/merged_image.jpg")
                copyfile(f"{pathSave}/{idx}_original.jpg", "output/original.jpg")
                boxToSend = boxesArr[idx].replace('\n', '')
                time.sleep(0.1)

            conn.sendall( str.encode( boxToSend ) )


        if code == '29':
            if file != None:
                file.close()
            break



HOST = '127.0.0.1'  # Standard loopback interface address (localhost)
PORT = 5551         # Port to listen on (non-privileged ports are > 1023)
    
def run():

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as soc:
        soc.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        soc.bind((HOST, PORT))

        while True:

            soc.listen()
            print('Waiting for connection ...')
            conn, addr = soc.accept()

            with conn:
                handleRun(conn, addr)


if __name__ == '__main__':

    run()

