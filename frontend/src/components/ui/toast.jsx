  import React from 'react';

  let listeners = [];
  export const toast = {
    success: (msg) => listeners.forEach((l) => l({ msg, type: 'success' })),
    error: (msg) => listeners.forEach((l) => l({ msg, type: 'error' })),
    info: (msg) => listeners.forEach((l) => l({ msg, type: 'info' })),
  };

  export const ToastViewport = () => {
    const [items, setItems] = React.useState([]);

    React.useEffect(() => {
      const handler = (item) => {
        const id = Date.now();
        setItems((prev) => [...prev, { id, ...item }]);
        setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3000);
      };
      listeners.push(handler);
      return () => { listeners = listeners.filter((l) => l !== handler); };
    }, []);

    return (
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {items.map((i) => (
          <div key={i.id} className="ds-card px-4 py-3 shadow-elevated border-l-4" style={{ borderLeftColor: i.type === 'success' ? 'hsl(var(--success))' : i.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))' }}>
            <span className="text-sm">{i.msg}</span>
          </div>
        ))}
      </div>
    );
  };
