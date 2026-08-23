import socket

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

if is_port_open(8000):
    print("Port 8000 is open")
else:
    print("Port 8000 is closed")
