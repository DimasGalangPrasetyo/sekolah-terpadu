<?php

namespace App\Enums;

enum AssetMovementType: string
{
    case Move = 'move';
    case Condition = 'condition';
    case Dispose = 'dispose';
}
