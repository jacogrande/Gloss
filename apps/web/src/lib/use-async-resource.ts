import {
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";

type PreserveDataOnErrorMode = boolean | "reload-only";

type AsyncResourceOptions<TData> = {
  dependencies: DependencyList;
  enabled?: boolean;
  getErrorMessage?: (error: unknown) => string;
  load: (signal: AbortSignal) => Promise<TData>;
  preserveDataOnError?: PreserveDataOnErrorMode;
};

type AsyncResourceState<TData> = {
  data: TData | null;
  error: unknown;
  errorMessage: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  reload: () => void;
};

const defaultErrorMessage = (): string => "Unable to load this resource.";

const areDependencyListsEqual = (
  left: DependencyList | null,
  right: DependencyList,
): boolean => {
  if (!left || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => Object.is(value, right[index]));
};

export const useAsyncResource = <TData>(
  options: AsyncResourceOptions<TData>,
): AsyncResourceState<TData> => {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(options.enabled ?? true));
  const [reloadKey, setReloadKey] = useState(0);
  const previousDependencies = useRef<DependencyList | null>(null);
  const previousReloadKey = useRef(reloadKey);

  useEffect(() => {
    if (options.enabled === false) {
      setData(null);
      setError(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    const dependencyChanged = !areDependencyListsEqual(
      previousDependencies.current,
      options.dependencies,
    );
    const triggeredByReload = previousReloadKey.current !== reloadKey;
    const shouldPreserveDataOnError =
      options.preserveDataOnError === true ||
      (options.preserveDataOnError === "reload-only" &&
        triggeredByReload &&
        !dependencyChanged);

    previousDependencies.current = options.dependencies;
    previousReloadKey.current = reloadKey;

    setIsLoading(true);
    setError(null);
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

        if (!shouldPreserveDataOnError) {
          setData(null);
        }
        setError(error);
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
  }, [reloadKey, ...options.dependencies]);

  return {
    data,
    error,
    errorMessage,
    isLoading,
    isRefreshing: isLoading && data !== null,
    reload: () => {
      setReloadKey((current) => current + 1);
    },
  };
};
