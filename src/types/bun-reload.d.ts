import "bun";

declare module "bun" {
  interface Socket<Data = undefined> {
    reload(options: Pick<SocketOptions<Data>, "socket">): void;
  }

  interface SocketListener<Data = undefined> {
    reload(options: Pick<SocketOptions<Data>, "socket">): void;
  }
}
