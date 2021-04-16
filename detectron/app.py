
import socket
import os
import sys
import json

file = open('images_data.json', 'r')
jsonData = json.load(file)


HOST = '127.0.0.1'
PORT = 6070

while True:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as soc:
        soc.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        soc.bind((HOST, PORT))
        print('Waiting for Connection ...')
        soc.listen()
        conn, addr = soc.accept()
        with conn:
            print('Connected by', addr)
            while True:
                data = str( conn.recv(2048) )
                # print(data)

                if not data or 'EOF' in data:
                    print('EOF')
                    break

                if 'jpg' in data:
                    data = data.replace('b', '').replace("'", '')
                    measurements = jsonData[data]['measurements']
                    strMeasures = ''
                    for measure in measurements:
                        if strMeasures != '':
                            strMeasures += ';'
                        strMeasures += measure

                    pose = jsonData[data]['pose']
                    messageToSend = f"{strMeasures} $ {pose}"

                    conn.sendall( str.encode( f"{messageToSend}" ) )
                else:
                    print(data)

        soc.close()
