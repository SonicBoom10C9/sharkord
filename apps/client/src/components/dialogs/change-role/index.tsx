import { PermissionsList } from '@/components/permissions-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AutoFocus } from '@/components/ui/auto-focus';
import { Group } from '@/components/ui/group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useRoles } from '@/features/server/roles/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { type TUser } from '@sharkord/shared';
import { Info } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TChangeRoleDialogProps = TDialogBaseProps & {
  user: TUser;
  refetch: () => Promise<void>;
};

const ChangeRoleDialog = memo(
  ({ isOpen, close, user, refetch }: TChangeRoleDialogProps) => {
    const ownUserId = useOwnUserId();
    const roles = useRoles();
    const [selectedRoleId, setSelectedRoleId] = useState<number>(user.roleId);
    const isOwnUser = ownUserId === user.id;

    const selectedRole = useMemo(
      () => roles.find((role) => role.id === selectedRoleId),
      [roles, selectedRoleId]
    );

    const onSubmit = useCallback(async () => {
      try {
        const trpc = getTRPCClient();

        await trpc.users.changeRole.mutate({
          userId: user.id,
          roleId: selectedRoleId
        });

        toast.success('Role changed successfully');
        close();
        refetch();
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to change role'));
      }
    }, [user.id, selectedRoleId, close, refetch]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role for {user.name}</AlertDialogTitle>
            {isOwnUser && (
              <Alert variant="default">
                <Info />
                <AlertDescription>
                  You are changing your own role.
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <Group label="Role">
              <Select
                onValueChange={(value) => setSelectedRoleId(Number(value))}
                value={selectedRoleId.toString()}
              >
                <SelectTrigger className="w-[230px]">
                  <SelectValue placeholder="Select the polling interval" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Group>

            <PermissionsList
              permissions={selectedRole?.permissions ?? []}
              variant="default"
              size="md"
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction onClick={onSubmit}>
                Save Role
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ChangeRoleDialog };
