type ILoadBalancer = {
    ROUND_ROBIN: Function;
    isEnabled: Function;
}

const loadbalancer = {} as ILoadBalancer;

loadbalancer.ROUND_ROBIN = (service: { index: number; instances: string | any[]; }) => {
    const newIndex = ++service.index >= service.instances.length ? 0 : service.index
    service.index = newIndex
    return loadbalancer.isEnabled(service, newIndex, loadbalancer.ROUND_ROBIN)
}

loadbalancer.isEnabled = (service: { instances: { [x: string]: { enabled: any; }; }; }, index: string | number, loadBalanceStrategy: (arg0: any) => any) => {
    return service.instances[index].enabled ? index : loadBalanceStrategy(service)
}

export { loadbalancer }