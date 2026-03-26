import {
  useEffect,
  useState,
  type DependencyList,
} from "react";

type AsyncResourceOptions<TData> = {
  dependencies: DependencyList;
  enabled?: boolean;
  getErrorMessage?: (error: unknown) => string;
  load: (signal: AbortSignal) => Promise<TData>;
};

type AsyncResourceState<TData> = {
  data: TData | null;
  errorMessage: string | null;
  isLoading: boolean;
};

const defaultErrorMessage = (): string => "Unable to load this resource.";

export const useAsyncResource = <TData>(
  options: AsyncResourceOptions<TData>,
): AsyncResourceState<TData> => {
  const [data, setData] = useState<TData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(options.enabled ?? true));

  useEffect(() => {
    if (options.enabled === false) {
      setData(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    setIsLoading(true);
    setErrorMessage(null);

    void options
      .load(abortController.signal)
      .then((nextData) => {
        setData(nextData);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        setData(null);
        setErrorMessage(
          options.getErrorMessage?.(error) ?? defaultErrorMessage(),
        );
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, options.dependencies);

  return {
    data,
    errorMessage,
    isLoading,
  };
};
