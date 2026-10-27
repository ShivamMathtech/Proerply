import { useQuery, useQueryClient } from "@tanstack/react-query";
import { services, MODE } from "./services";
import { useUI } from "./state";
export const useWorkspace = () =>
  useQuery({
    queryKey: ["workspace"],
    queryFn: () => services.snapshot(),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });
export const useCatalog = () =>
  useQuery({
    queryKey: ["catalog"],
    queryFn: () => services.courses.listCourses(),
    staleTime: 60000,
  });
export const useInstructors = () =>
  useQuery({
    queryKey: ["instructors"],
    queryFn: () => services.courses.instructors(),
  });
export function useAction() {
  const client = useQueryClient();
  const notice = useUI((s) => s.notice);
  return async <T>(
    action: () => Promise<T>,
    success?: string,
  ): Promise<T | undefined> => {
    try {
      const value = await action();
      await client.invalidateQueries();
      if (success) notice(success);
      return value;
    } catch (error) {
      notice(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      return undefined;
    }
  };
}
export { MODE, services };
