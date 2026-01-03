// In Gosilang style, we might have a tuple return for operations
// Let's assume a mutex lock and unlock mechanism

type Counter struct {
    value int
    mutex Mutex
}

func (c *Counter) Increment() (_, ok) {
    c.mutex.Lock()
    defer c.mutex.Unlock()
    c.value++
    return nil, true
}

func (c *Counter) Get() (value int, ok) {
    c.mutex.Lock()
    defer c.mutex.Unlock()
    return c.value, true
}