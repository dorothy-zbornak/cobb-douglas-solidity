import matplotlib.pyplot as plt
import json
import os.path

DATA_FILE = os.path.normpath(os.path.join(os.path.dirname(__file__), '../data/ln.json'))
with open(DATA_FILE) as f:
    data = json.loads(f.read())

data = sorted(data, key=lambda d: float(d['input']))
max_error = max(d['error'] for d in data)
min_error = min(d['error'] for d in data)
print(f'error range: [{min_error}, {max_error}]')

plt.plot([float(d['input']) for d in data], [d['error'] for d in data])
plt.yscale('log')
plt.ylabel('ln(x) error (log scale)')
plt.xlabel('input x')
plt.title(f'ln(x) absolute error')
plt.show()
